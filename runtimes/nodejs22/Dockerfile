FROM alpine:latest
RUN apk add --no-cache zip

WORKDIR /pack
COPY src .
RUN zip -r ../function.zip .
