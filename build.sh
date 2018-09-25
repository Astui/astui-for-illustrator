#!/usr/bin/env bash

# Create version string.

VERS=`date +%s`

# If the `build` directory exists, delete it.

if [ -d build ]; then
    rm -Rf build
fi

# Create a clean build directory.

mkdir build

# Copy source code to build directory.

cp -R client build/client
cp -R csxs build/csxs
cp -R host build/host

# Delete old builds.

rm dist/*

# Build and sign the extension.

./bin/ZXPSignCmd -sign build dist/com.astui.ill.$VERS.zxp ./bin/selfDB.p12 Alias2Mocha7 -tsa https://www.safestamper.com/tsa

# Delete the build directory.

if [ -d build ]; then
    rm -Rf build
fi