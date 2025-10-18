#!/bin/bash
ARCH=$1

(cd src && dotnet publish -c Release -o publish-${ARCH})
(cd src/publish-${ARCH} && zip -r ../../function.zip .)
