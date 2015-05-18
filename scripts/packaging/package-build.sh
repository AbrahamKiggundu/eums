#!/bin/bash

set -e

mkdir build
echo "empty build file" >> build/eums_docker_image.tar
cp scripts/packaging/install-image-eums.sh build/install-image-eums.sh
cp -r scripts/deployment build/deployment
