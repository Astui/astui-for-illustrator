#!/usr/bin/env bash

VERS=`date +%s`

if [ -d build ]; then
    rm -Rf build
fi

mkdir build
cp -R client build/client
cp -R csxs build/csxs
cp -R host build/host

./bin/ZXPSignCmd -sign build builds/com.astute.astui-illustrator.$VERS.zxp ./bin/selfDB.p12 Alias2Mocha7 -tsa https://www.safestamper.com/tsa

if [ -d build ]; then
    rm -Rf build
fi