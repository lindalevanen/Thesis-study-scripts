# Replace arrow functions with CommonJS functions, because arrow functions are anonymous in the es6-plato report,
# and tags '<>'' with '<React.Framgent>'', because es6-plato can't parse them.

# either the commit hash or 'pilot' should be provided as an argument
# when 'pilot' provided, pre-defined paths in 'arr' will be used

declare -a arr=(
    'src/components/Authentication/login.js'
    'src/components/CustomerOrder/CustomerOrderDetails/index.js' 'src/components/CustomerOrder/CustomerOrderDetails/HelperComponents.js'
    'src/components/CustomerOrder/CustomerOrderDetails/HelperMethods.js' 'src/components/CustomerOrder/CustomerOrderDetails/TrackingDetails.js'
    'src/components/CustomerOrder/OrderLineComponent.js'
    'src/components/CustomerOrder/index.js'
    'src/components/Home/index.js'
    'src/components/Store/index.js'
    'src/components/Store/StoreMap.js'
    'src/components/Store/reducers.js'
    'src/components/common/CommonComponents.js'
    'src/components/common/Loading/index.js'
    'src/components/common/Search/index.js'
    'src/components/layouts/CoreLayout.js' 'src/components/layouts/Loading.js' 'src/components/layouts/NavigationBar.js' 'src/components/layouts/actions.js' 'src/components/layouts/reducers.js'

    'src/components/Authentication/Register/index.js'

    'src/components/Register/actions.js' 'src/components/Register/index.js' 'src/components/Register/reducers.js'
    'src/components/Home/SearchList/index.js'
    'src/components/Home/SearchList/Search/index.js'
    'src/components/Home/SearchList/Search/ListFilter/index.js'
    'src/components/Store/StoreDetails/StoreAdditional/index.js'
    'src/components/Store/StoreDetails/StoreMain/index.js'
    'src/components/common/Search/ListFilter/index.js'
)

# Replace arrow functions with CommonJS, replace React.Fragment shorthands '<>' with '<React.Fragment>'
# $1: file path
replaceES6 () {
    if [ -f "$1" ]; then
        if [[ $1 =~ [a-zA-Z]+\.js$ ]]; then
            # replace the shorthand jsx <> with <React.Fragment>
            sed -i '' 's|<>|<React.Fragment>|' $1
            sed -i '' 's|</>|</React.Fragment>|' $1

            # Replace exported arrow functions with regular functions
            sed -E -i '' 's|const ([a-z][a-zA-Z]+) = ([a-zA-Z]+) => {|function \1(\2) {|' $1 # one param without brackets
            sed -E -i '' 's|const ([a-z][a-zA-Z]+) = \(([^)]*)\) => {|function \1(\2) {|' $1 # multiple params with brackets

            # functions inside a class
            sed -E -i '' 's|^( *[a-z][a-zA-Z]+) = ([a-zA-Z]+) => {|\1(\2) {|' $1 # one param without brackets
            sed -E -i '' 's|^( *[a-z][a-zA-Z]+) = \(([^)]*)\) => {|\1(\2) {|' $1 # multiple params with brackets
        fi
    else
        echo "$1 does not exist."
    fi
}

if [ $1 = "pilot" ] ; then
    for i in "${arr[@]}"
    do
        replaceES6 "$i"
    done
else
    git diff-tree --no-commit-id --name-only -r $1 | while read filePath
    do
        replaceES6 "$filePath"
    done
fi

