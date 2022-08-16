#!/bin/bash

wget https://oss.npmmirror.com/dist/node/v14.18.1/node-v14.18.1-linux-x64.tar.xz

tar xf node-v14.18.1-linux-x64.tar.xz

export PATH=$PATH:`pwd`/node-v14.18.1-linux-x64/bin

npm i

node ./install.js

npm run start