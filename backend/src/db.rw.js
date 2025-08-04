// MongoDB Read/Write Splitting Helper
// Sử dụng cho backend Node.js

const { MongoClient } = require('mongodb');

const MONGO_URI_WRITE = process.env.MONGO_URI_WRITE || 'mongodb://mongo-write:27017/lung_app';
const MONGO_URI_READ = process.env.MONGO_URI_READ || 'mongodb://mongo-read:27017/lung_app';

let mongoClientWrite = null;
let mongoClientRead = null;

async function getMongoClientWrite() {
  if (!mongoClientWrite || !mongoClientWrite.topology?.isConnected()) {
    mongoClientWrite = await MongoClient.connect(MONGO_URI_WRITE, { maxPoolSize: 20 });
  }
  return mongoClientWrite;
}

async function getMongoClientRead() {
  if (!mongoClientRead || !mongoClientRead.topology?.isConnected()) {
    mongoClientRead = await MongoClient.connect(MONGO_URI_READ, { maxPoolSize: 20 });
  }
  return mongoClientRead;
}

async function getDbWrite() {
  const client = await getMongoClientWrite();
  return client.db();
}

async function getDbRead() {
  const client = await getMongoClientRead();
  return client.db();
}

module.exports = {
  getDbWrite,
  getDbRead
};
