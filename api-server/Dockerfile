 FROM node:20-alpine
   WORKDIR /home/app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 9001 9000
   CMD ["node", "src/index.js"]