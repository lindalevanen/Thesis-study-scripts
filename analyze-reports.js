/* eslint-disable indent */
const fs = require('fs')
const path = require('path')
const _ = require('lodash')

/**
 * Reads es6-plato generated reports from target dir,
 * calculates differences of metrics between before and after states of files,
 * calculates commit averages or aggregates for each metric,
 * calculates report averages or aggregates for each metric,
 * writes the results to analysis-results/
 * @param target: the results folder to read the generated reports from
 * @param average: set as true to calculate the results based on method averages instead of method aggregates
 */

const target = process.argv[2]
const reportsPath = path.join(process.cwd(), `/${target}`);

const method = process.argv[3] === 'average' ? 'average' : 'aggregate'

const METRIC_PATHS = {
  halstead_bugs: `complexity.${method}.complexity.halstead.bugs`,
  halstead_difficulty: `complexity.${method}.complexity.halstead.difficulty`,
  halstead_effort: `complexity.${method}.complexity.halstead.effort`,
  halstead_length: `complexity.${method}.complexity.halstead.length`,
  halstead_time: `complexity.${method}.complexity.halstead.time`,
  halstead_vocabulary: `complexity.${method}.complexity.halstead.vocabulary`,
  halstead_volume: `complexity.${method}.complexity.halstead.volume`,
  physical_loc: `complexity.${method}.complexity.sloc.physical`,
  maintainability_index: `complexity.maintainability`,
  cyclomatic_complexity: `complexity.${method}.complexity.cyclomatic`
}

const round = num => Math.round(num * 1000) / 1000

const getMetricDiff = (reportA, reportB, path) => {
  const valA = _.get(reportA, path)
  const valB = _.get(reportB, path)
  return round(valA - valB)
}

const getMetricPercentChange = (reportA, reportB, path) => {
    const valA = _.get(reportA, path)
    const valB = _.get(reportB, path)
    return round((valA - valB) / valB * 100)
}

// todo: aja node analyze-reports.js refactor-reports average ja aggregate ja tsekkaa esimerkil tai paril onks changeis järkee

const parseReports = async () => {
  const reportData = {};
  try {
    const reports = await fs.promises.readdir(reportsPath);

    // For each commit, calculate differences of metrics in before and after states of each changed file in the commit,
    // and then metric differences of metric averages/aggregates of changed files for the whole before and after states of the commit
    for (const file of reports) {
      const commitPath = path.join(reportsPath, file);
      const stat = await fs.promises.stat(commitPath);

      if (stat.isDirectory()) {
        const reportBefore = require(path.join(commitPath, 'before/report.json'))
        const reportAfter = require(path.join(commitPath, 'after/report.json'))

        // Go through individual files in commits
        const reportBeforeFiles = reportBefore.reports
        const reportAfterFiles = reportAfter.reports

        reportData[file] = {}
        const fileMetricsSumB = {}
        for (const fileReportB of reportBeforeFiles) {

          const fileReportBName = fileReportB.info.file
          const fileReportA = reportAfterFiles.find(report => report.info.file === fileReportBName)
          Object.keys(METRIC_PATHS).forEach(metricKey => {
            // Calculate metric averages for the whole before state of the report
            fileMetricsSumB[metricKey] = (fileMetricsSumB[metricKey] || 0) + _.get(fileReportB, METRIC_PATHS[metricKey])

            if (fileReportA) {
              // Calculate metric differences for files in both before and after states
              const existingFiles = reportData[file].files || {}

              reportData[file] = {
                ...reportData[file],
                files: {
                  ...existingFiles,
                  [fileReportBName]: {
                    ...(existingFiles[fileReportBName] || {}),
                    [metricKey]: {
                        diff: getMetricDiff(fileReportA, fileReportB, METRIC_PATHS[metricKey]),
                        change: getMetricPercentChange(fileReportA, fileReportB, METRIC_PATHS[metricKey]),
                    }
                  }
                }
              }
            }

          })
        }
        const fileMetricsSumA = {}
        for (const fileReportA of reportAfterFiles) {
          Object.keys(METRIC_PATHS).forEach(metricKey => {
            // Calculate metric averages for the whole after state of the report
            fileMetricsSumA[metricKey] = (fileMetricsSumA[metricKey] || 0) + _.get(fileReportA, METRIC_PATHS[metricKey])
          })
        }

        // Save averages of metrics of all files in the BEFORE state in the commit to fileAveragesBefore
        const filesAmountB = reportBeforeFiles.length
        Object.keys(fileMetricsSumB).forEach(metricKey => {
          reportData[file].fileAveragesBefore = {
            ...reportData[file].fileAveragesBefore || {},
            [metricKey]: round(fileMetricsSumB[metricKey] / filesAmountB)
          }
        })
        // Save averages of metrics of all files in the AFTER state in the commit to fileAveragesAfter
        const filesAmountA = reportAfterFiles.length
        Object.keys(fileMetricsSumA).forEach(metricKey => {
          reportData[file].fileAveragesAfter = {
            ...reportData[file].fileAveragesAfter || {},
            [metricKey]: round(fileMetricsSumA[metricKey] / filesAmountA)
          }
        })
        // Save differences of averages of all files to fileAveragesDiff
        if(reportData[file].fileAveragesBefore && reportData[file].fileAveragesAfter) {
          Object.keys(fileMetricsSumB).forEach(metricKey => {
            const FAbefore = reportData[file].fileAveragesBefore[metricKey]
            const FAafter = reportData[file].fileAveragesAfter[metricKey]
            reportData[file].fileAveragesDiffs = {
              ...reportData[file].fileAveragesDiffs || {},
              [metricKey]: {
                  diff: round(FAafter - FAbefore),
                  change: round((FAafter - FAbefore) / FAbefore * 100)
              }
            }
          })
        }
      }
    }
    return reportData
  }
  catch (e) {
     console.error(e);
  }
};

parseReports().then(reportData => {

  const reportDataNoEmpty = Object.keys(reportData)
    .filter(key => reportData[key].fileAveragesDiffs)
    .reduce((acc, cur) => ({ ...acc, [cur]: reportData[cur] }),{})

  // Calculate averages of metrics of all files in the before state of the commit from fileAveragesBefore
  const reportAvgsB = {}
  Object.keys(METRIC_PATHS).forEach(metricKey => {
    const reportAvg = Object.keys(reportDataNoEmpty).reduce((acc, cur) => (
        acc + reportDataNoEmpty[cur].fileAveragesBefore[metricKey]
      ), 0) / Object.keys(reportDataNoEmpty).length
      reportAvgsB[metricKey] = round(reportAvg)
  })

  // Calculate averages of metrics of all files in the after state of the commit from fileAveragesAfter
  const reportAvgsA = {}
  Object.keys(METRIC_PATHS).forEach(metricKey => {
    const reportAvg = Object.keys(reportDataNoEmpty).reduce((acc, cur) => (
        acc + reportDataNoEmpty[cur].fileAveragesAfter[metricKey]
      ), 0) / Object.keys(reportDataNoEmpty).length
      reportAvgsA[metricKey] = round(reportAvg)
  })

  const parsedReportArr = Object.keys(reportDataNoEmpty).map(hash => ({
    commitHash: hash,
    ...reportDataNoEmpty[hash]
  }))

  const jsonReport = JSON.stringify({
    reports: parsedReportArr,
    averagesBefore: reportAvgsB,
    averagesAfter: reportAvgsA
  })

  const timestamp = Date.now()
  const pathStart = `analysis-results/${target}/${method}-${timestamp}`

  fs.mkdirSync(pathStart, { recursive: true })

  fs.writeFile(`${pathStart}/report.json`, jsonReport, err => {
    if (err) {
      throw err;
    }
  });

  // CSV for latex table

  const metricsArr = item => [
    item.halstead_bugs,
    item.halstead_difficulty,
    item.halstead_effort,
    item.halstead_length,
    item.halstead_time,
    item.halstead_vocabulary,
    item.halstead_volume,
    item.physical_loc,
    item.maintainability_index,
    item.cyclomatic_complexity
  ]

  const allRows = parsedReportArr.map(item => (
    [item.commitHash.substring(0, 7), ...metricsArr(item.fileAveragesDiffs)]
  ))

  const avgDiffs = Object.keys(reportAvgsB).reduce((acc, metricKey) => ({
    ...acc, [metricKey]: round(reportAvgsA[metricKey] - reportAvgsB[metricKey])
  }), {})

  const percentChange = Object.keys(reportAvgsB).reduce((acc, metricKey) => ({
    ...acc, [metricKey]: round((reportAvgsA[metricKey] - reportAvgsB[metricKey]) / reportAvgsB[metricKey] * 100)
  }), {})

  saveCSV(allRows, `${pathStart}/report.csv`, true)


  const beforeAfterDiffRows = Object.keys(METRIC_PATHS).map(metricKey => (
      [reportAvgsB[metricKey], reportAvgsA[metricKey], avgDiffs[metricKey], percentChange[metricKey]]
  ))
  oneCommitSaveCSV(beforeAfterDiffRows, `${pathStart}/avgs-before-after-diff.csv`)

  console.log(`Data saved to: ${pathStart}/`)
})

const saveCSV = (rows, path, withHash) => {
  let csvContent = 'Bugs,Difficulty,Effort,Length,Time,Vocabulary,Volume,Loc,MI,Cyclomatic complexity\r\n'
  csvContent = withHash ? `Commit hash,${csvContent}` : csvContent

  rows.forEach(r => {
    const row = r.join(',');
    csvContent += row + "\r\n";
  });

  fs.writeFile(path, csvContent, err => {
    if (err) { throw err; }
  });
}

const oneCommitSaveCSV = (rows, path) => {
    let csvContent = 'Metric,Before,After,Difference,Change (%)\r\n'
    const firstColCells = ['Number of Bugs','Difficulty','Effort','Length','Time','Vocabulary','Volume','Physical lines of code','Maintainability index','Cyclomatic complexity']

    firstColCells.forEach((measure,i) => {
        const row = rows[i].join(',');
        csvContent += `${measure},${row}\r\n`
    })

    fs.writeFile(path, csvContent, err => {
      if (err) { throw err; }
    });
  }