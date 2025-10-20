# FROM alpine:latest
# RUN apk add --no-cache zip

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder
RUN apt-get update
RUN apt-get install -y zip

WORKDIR /pack
COPY src .
RUN zip -r ../function.zip .
