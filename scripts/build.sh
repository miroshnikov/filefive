#!/bin/bash

rm -rf dist
tsc -p .
cp -r ./src/icon-themes ./dist/
cd frontend
yarn build
