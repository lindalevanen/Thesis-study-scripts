# Runs the analysis for the pilot study

beforeHash=b43e97e33660d2d88e47c1d5538d27075ee24159
afterHash=c69d2eee27efcd8a862c6c1290ae326953a623a8

target=pilot-report

git clean -fd "$target/"

declare -a safeToClean=('src/' 'config/' 'public/' 'manifests/' 'i18n/' 'scripts/' 'package.json' 'package-lock.json')

clean () {
    for i in "${safeToClean[@]}"
    do
        git clean -fd "$i"
        git checkout "$i"
    done
}

git checkout $beforeHash
bash replace-es6.sh pilot
node plato-script.js before $beforeHash $target
clean

git checkout $afterHash
bash replace-es6.sh pilot
node plato-script.js after $beforeHash $target
clean

node analyze-reports.js $target average
node analyze-reports.js $target aggregate