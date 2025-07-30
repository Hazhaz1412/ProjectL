FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install --save-dev migrate-mongo
RUN cp -r node_modules ../
COPY . .

CMD ["npm", "run", "dev"]
