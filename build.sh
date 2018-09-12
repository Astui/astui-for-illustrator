#!/usr/bin/env bash

VERS=`date +%s`

if [ -d build ]; then
    rm -Rf build
fi

mkdir build
cp -R client build/client
cp -R csxs build/csxs
cp -R host build/host

./ZXPSignCmd -sign build builds/com.astute.astui-illustrator.$VERS.zxp selfDB.p12 Alias2Mocha7 -tsa https://www.safestamper.com/tsa

if [ -d build ]; then
    rm -Rf build
fi