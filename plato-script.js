var plato = require('es6-plato');
var pLintRules = {}
try {
    const lintrules = require('./.eslintrc.js')
    pLintRules = { ...lintrules }
    pLintRules.globals = []
} catch (e) {}

const pilotFiles = [
    'src/components/Authentication/login.js',
    'src/components/CustomerOrder/CustomerOrderDetails/*.js',
    'src/components/CustomerOrder/OrderLineComponent.js',
    'src/components/CustomerOrder/index.js',
    'src/components/Home/index.js',
    'src/components/Store/index.js',
    'src/components/Store/StoreMap.js',
    'src/components/Store/reducers.js',
    'src/components/common/CommonComponents.js',
    'src/components/common/Loading/*.js',
    'src/components/common/Search/*.js',
    'src/components/layouts/*.js',

    'src/components/Authentication/Register/index.js',

    'src/components/Register/*.js',
    'src/components/Home/SearchList/*.js',
    'src/components/Home/SearchList/Search/*.js',
    'src/components/Home/SearchList/Search/*.js',
    'src/components/Home/SearchList/Search/ListFilter/*.js',
    'src/components/Store/StoreDetails/StoreAdditional/*.js',
    'src/components/Store/StoreDetails/StoreMain/*.js',
    'src/components/common/Search/ListFilter/*.js'
]

const before = process.argv[2] == 'before';
const hash = process.argv[3];
const target = process.argv[4];

var files = []
var commitMessage = ''

if (target === 'pilot-report') {
    files = pilotFiles
    commitMessage = before ? 'Report before UI 3.0' : 'Report after UI 3.0'
} else {
    commitMessage = process.argv[5].split('|').join(' ');

    const ANALYSIS_PATHS = ['src/components', 'src/middleware', 'src/store', 'src/sw'];

    var i = 6;
    while (process.argv[i]) {
        const path = process.argv[i]
        console.log(path)
        const filePartOfAnalysis = ANALYSIS_PATHS.some(p => path.startsWith(p))
        if (filePartOfAnalysis) {
            files = [...files, process.argv[i]]
        }
        i++;
    }
    console.log(files)
}

const callback = reports => {
    const overview = plato.getOverviewReport(reports);
    const { total, average } = overview.summary;


    const output = `total
    ----------------------
    eslint: ${total.eslint}
    sloc: ${total.sloc}
    maintainability: ${total.maintainability}
    average
    ----------------------
    eslint: ${average.eslint}
    sloc: ${average.sloc}
    maintainability: ${average.maintainability}`;

    console.log(output);
}

if (files.length) {
    const outputDir = `./${target}/${hash}/${before ? 'before' : 'after'}`;

    const platoArgs = {
        title: before ? `Report before: '${commitMessage}'` : `Report after '${commitMessage}'`,
        eslint: pLintRules
    };

    plato.inspect(files, outputDir, platoArgs, callback);
}
