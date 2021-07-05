#! /bin/sh

start_time="$(date -u +%s)"
reportAmount=4
refactor=true
invert=""
target=refactor-reports

while getopts a:r: flag
do
    case "${flag}" in
        a) reportAmount=$((OPTARG+1));;
        r) refactor=${OPTARG};;
    esac
done

if [ "$refactor" = false ] ; then
    invert="--invert-grep"
    target=non-refactor-reports
fi

declare -a safeToClean=('src/' 'config/' 'public/' 'manifests/' 'i18n/' 'scripts/' 'package.json' 'package-lock.json', 'yarn.lock')

clean () {
    for i in "${safeToClean[@]}"
    do
        git clean -fd "$i"
        git checkout "$i"
    done
}

clean
git clean -fd "$target/"
git checkout fa02a14db31797f111c4e5c67796d64871eed9dc
clean
git log --no-merges --author="\(Markus\)\|\(Maria\)\|\(Linda\)" --grep=refactor $invert --format=format:'%H' -n $reportAmount -- 'src/*.js' | while read hash
do
  gt=$(git diff-tree --no-commit-id --name-only -r $hash)

  commitMessage=$(git log -n 1 --pretty=format:%s $hash)
  parsedCM=${commitMessage// /|}

  echo ------------- Start report generation! -------------
  echo paths: $gt
  echo commithash: $hash

  git checkout $hash
  yarn
  npm link es6-plato
  bash replace-es6.sh $hash
  node plato-script.js after $hash $target $parsedCM $gt
  clean

  git checkout HEAD~1
  bash replace-es6.sh $hash
  node plato-script.js before $hash $target $parsedCM $gt
  clean

done

echo ------------- Reports created! Start analysis... -------------
end_time="$(date -u +%s)"
elapsed="$(($end_time-$start_time))"
echo "Total time elapsed: $elapsed seconds"

node analyze-reports.js $target average
node analyze-reports.js $target aggregate