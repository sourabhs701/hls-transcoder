FROM node:20-alpine

RUN apk update && \
    apk add --no-cache ffmpeg bash

WORKDIR /home/app

COPY package*.json ./
RUN npm install 

COPY . .

ENTRYPOINT ["node" , "/home/app/src/index.js"]
