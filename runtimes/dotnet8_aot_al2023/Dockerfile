FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder
ARG ARCHITECTURE

RUN apt-get update
RUN apt-get install -y zip clang zlib1g-dev libssl-dev

WORKDIR /pack
COPY src .

RUN if [ "$ARCHITECTURE" = "x86_64" ]; then \
        echo "x64" > /tmp/arch.txt; \
    else \
        echo "$ARCHITECTURE" > /tmp/arch.txt; \
    fi

RUN ARCH=$(cat /tmp/arch.txt) && \
    dotnet publish --arch ${ARCH} --configuration Release --output publish

WORKDIR /pack/publish

# For .NET AOT, the compiled executable becomes the bootstrap
RUN mv LambdaBenchmark bootstrap
RUN chmod +x bootstrap

RUN zip -r ../../function.zip .
