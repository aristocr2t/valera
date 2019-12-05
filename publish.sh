#!/bin/bash

cd $(dirname $(readlink -f "$0"))

if [ ! -d node_modules ]; then
  npm install
fi

npm run rebuild

node copy-package.js
cp LICENSE dist/LICENSE
cp README.md dist/README.md

cd dist

npm publish

cd ..
