#!/bin/bash

npm i

tar zcf cgserver.tgz bin node_modules views routes cloud_rendering_lib *.js *.json

docker build . -t cgserver

docker images | grep cgserver

rm -f cgserver.tgz