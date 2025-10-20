FROM alpine:latest
RUN apk add --no-cache zip curl

ARG ARCHITECTURE

WORKDIR /build

RUN URL="https://github.com/awslabs/llrt/releases/latest/" && \
    REDIRECT_URL=$(curl "$URL" -s -L -I -o /dev/null -w '%{url_effective}') && \
    VERSION=$(echo $REDIRECT_URL | awk -F'/' '{print $NF}') && \
    echo $VERSION > /tmp/version.txt

RUN if [ "$ARCHITECTURE" = "x86_64" ]; then \
        echo "x64" > /tmp/arch.txt; \
    else \
        echo "$ARCHITECTURE" > /tmp/arch.txt; \
    fi

RUN VERSION=$(cat /tmp/version.txt) && \
    ARCH=$(cat /tmp/arch.txt) && \
    LAMBDA_PACKAGE="llrt-lambda-${ARCH}.zip" && \
    LAMBDA_URL="https://github.com/awslabs/llrt/releases/download/${VERSION}/${LAMBDA_PACKAGE}" && \
    curl -L ${LAMBDA_URL} -o ${LAMBDA_PACKAGE}

RUN ARCH=$(cat /tmp/arch.txt) && \
    LAMBDA_PACKAGE="llrt-lambda-${ARCH}.zip" && \
    unzip -j ${LAMBDA_PACKAGE} bootstrap

RUN ARCH=$(cat /tmp/arch.txt) && \
    LAMBDA_PACKAGE="llrt-lambda-${ARCH}.zip" && \
    rm ${LAMBDA_PACKAGE}

RUN chmod +x bootstrap

COPY src/index.mjs .
RUN zip ../function.zip index.mjs bootstrap