#!/bin/bash
BUILD_DIR=./build
getProperty() {
    cat ./.env | grep -w "$1" | cut -d '=' -f 2 | tr -d '\n' | tr -d '\r'
}

addAppToImportMap() {

    KEY=`node -e "console.log(require('./package.json').name);"`
    DESCRIPTION=`node -e "console.log(require('./package.json').description);"`
    PACKAGE_VERSION=`node -e "console.log(require('./package.json').version);"`
    VERSION="${PACKAGE_VERSION}_${BUILD_NUMBER}"
    OUTDIR="build/${VERSION}" 
    npm run build
    FILENAME=`ls ./build | grep .js$`
    mkdir -p $OUTDIR
    cp ./build/$FILENAME ./$OUTDIR
    echo $FILENAME

    cp Application.properties .env
    echo "" >> .env
    echo "APP_FULL_KEY=${KEY}" >> .env
    echo "APP_DESCRIPTION=${DESCRIPTION}" >> .env
    echo "APP_FILENAME=${VERSION}/${FILENAME}" >> .env
    echo "APP_VERSION=${VERSION}" >> .env
    echo "APP_COMMIT=${GIT_COMMIT}" >> .env

    mkdir -p "../output/content/app/${KEY}/${VERSION}"
    APP_ICON="$(getProperty APP_ICON)"
    if [[ ! -z "$APP_ICON" ]]; then
        mkdir -p "../output/content/icons/${KEY}/${VERSION}"
        cp $APP_ICON "../output/content/icons/${KEY}/${VERSION}"
    fi
    mkdir -p "../output/config"
    cp build/${VERSION}/* ../output/content/app/${KEY}/${VERSION}

    docker-compose -f ../../docker-compose.yml run  -e APP_KEY="$KEY" \
    -e APP_TITLE="$(getProperty APP_TITLE)" \
    -e APP_VERSION="$(getProperty APP_VERSION)" \
    -e APP_DESCRIPTION="$(getProperty APP_DESCRIPTION)" \
    -e APP_FILENAME="$(getProperty APP_FILENAME)" \
    -e APP_ROUTES="$(getProperty APP_ROUTES)" \
    -e APP_PRIORITY="$(getProperty APP_PRIORITY)" \
    -e APP_COMMIT="$(getProperty APP_COMMIT)" \
    -e APP_ICON="$(getProperty APP_ICON)" \
    -e APP_ROUTES_MATCH_MODE="$(getProperty APP_ROUTES_MATCH_MODE)" \
    -e IS_MODULE="$(getProperty IS_MODULE)" \
    -e APP_ARTIFACT_NAME="$(getProperty APP_ARTIFACT_NAME)" \
    -e APP_ROLE="$(getProperty APP_ROLE)" \
    -e FUNCTION=add \
    manageApps
    

}

setupApp() {
    echo "Setting up app $1"
    git clone https://github.com/tbiegner99/$1.git
    cd ./$1
    npm i
    addAppToImportMap $1
    cd ../

}
# rm -rf ./build
mkdir -p ${BUILD_DIR}/output
cp ../server/* ./build/output
mkdir -p ${BUILD_DIR}/config
cp ../config/* ./build/config
mkdir -p ${BUILD_DIR}/output/content/config

echo $BUILD_DIR
cd $BUILD_DIR

# git clone https://github.com/tbiegner99/home-automation-main-ui-single-spa.git
# buildMain
setupApp home-automation-main-ui-single-spa
mkdir -p ./output/content/html
cp ./home-automation-main-ui-single-spa/build/*.html ./output/content/html
setupApp home-automation-components
setupApp base-ui-app-components
while [ ! -z "$1" ]; do
    
    setupApp $1
    shift
done


