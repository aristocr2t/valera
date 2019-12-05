#!/bin/node

const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json').toString());

delete packageJson.scripts;
delete packageJson.devDependencies;

fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));
