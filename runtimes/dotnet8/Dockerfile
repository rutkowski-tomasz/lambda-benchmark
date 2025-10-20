FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder
ARG ARCHITECTURE

RUN apt-get update
RUN apt-get install -y zip

WORKDIR /pack
COPY src .
RUN if [ "$ARCHITECTURE" = "x86_64" ]; then \
        ARCH="x64"; \
    elif [ "$ARCHITECTURE" = "arm64" ]; then \
        ARCH="arm64"; \
    fi && \
    dotnet publish --arch ${ARCH} --configuration Release --output publish

WORKDIR /pack/publish
RUN zip -r ../../function.zip .
