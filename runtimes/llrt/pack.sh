#!/bin/bash
RUNTIME_NAME="llrt"
ARCH=$1
BUILD_TYPE="zip"

if [ $ARCH = "x86_64" ]; then
    ARCH="x64"
fi

URL="https://github.com/awslabs/llrt/releases/latest/";
REDIRECT_URL=$(curl "$URL" -s -L -I -o /dev/null -w '%{url_effective}')
VERSION=$(echo $REDIRECT_URL | awk -F'/' '{print $NF}')

rm llrt-container* 2> /dev/null
rm llrt-lambda* 2> /dev/null
rm bootstrap 2> /dev/null
rm function.zip 2> /dev/null

LAMBDA_PACKAGE="llrt-lambda-${ARCH}.zip"
LAMBDA_URL="https://github.com/awslabs/llrt/releases/download/${VERSION}/${LAMBDA_PACKAGE}"
curl -L ${LAMBDA_URL} > ${LAMBDA_PACKAGE}

unzip -j ${LAMBDA_PACKAGE} bootstrap -d .
rm ${LAMBDA_PACKAGE}

chmod +x bootstrap
zip -j function.zip src/index.mjs
zip -j function.zip bootstrap
