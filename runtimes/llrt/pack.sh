#!/bin/bash
RUNTIME_NAME="llrt"
ARCH=$1
BUILD_TYPE="zip"

# Default to arm64 if no architecture specified
if [ -z "$ARCH" ]; then
    ARCH="arm64"
fi

# Get the latest version name by following the redirect URL
URL="https://github.com/awslabs/llrt/releases/latest/";
REDIRECT_URL=$(curl "$URL" -s -L -I -o /dev/null -w '%{url_effective}')
VERSION=$(echo $REDIRECT_URL | awk -F'/' '{print $NF}')

DIR_NAME="."

if [ $ARCH = "x86_64" ]; then
    ARCH="x64"
elif [ $ARCH = "arm64" ]; then
    ARCH="arm64"
else
    echo "The process architecture $ARCH is set incorrectly. The value can only be either x86_64 or arm64."
    exit 1
fi

# Clean up old files
rm ${DIR_NAME}/llrt-container* 2> /dev/null
rm ${DIR_NAME}/llrt-lambda* 2> /dev/null
rm ${DIR_NAME}/bootstrap 2> /dev/null
rm ${DIR_NAME}/function.zip 2> /dev/null

# Download LLRT lambda package and extract bootstrap
LAMBDA_PACKAGE="llrt-lambda-${ARCH}.zip"
LAMBDA_URL="https://github.com/awslabs/llrt/releases/download/${VERSION}/${LAMBDA_PACKAGE}"
echo "Downloading LLRT lambda package: ${LAMBDA_PACKAGE} from ${LAMBDA_URL}"
curl -L ${LAMBDA_URL} > ${DIR_NAME}/${LAMBDA_PACKAGE}

# Extract only the bootstrap binary
echo "Extracting bootstrap binary..."
unzip -j ${DIR_NAME}/${LAMBDA_PACKAGE} bootstrap -d ${DIR_NAME}
chmod +x ${DIR_NAME}/bootstrap

# Clean up the lambda package (we only needed the bootstrap)
rm ${DIR_NAME}/${LAMBDA_PACKAGE}

# Create function package with source code and bootstrap
echo "Creating function package..."
zip -j ${DIR_NAME}/function.zip ${DIR_NAME}/src/index.mjs
zip -j ${DIR_NAME}/function.zip ${DIR_NAME}/bootstrap

echo "LLRT packaging completed successfully!"
