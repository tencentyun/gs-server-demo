FROM node:12

LABEL maintainer="transcai@tencent.com"

WORKDIR /cgserver

COPY cgserver.tgz /cgserver/

RUN tar zxf cgserver.tgz && rm -f cgserver.tgz && npm i

CMD [ "node", "bin/www" ]