const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'lung_app';

let globalMongoClient = null;
async function getMongoClient() {
  if (globalMongoClient && globalMongoClient.topology && globalMongoClient.topology.isConnected()) {
    return globalMongoClient;
  }
  globalMongoClient = await MongoClient.connect(MONGO_URI, { maxPoolSize: 20 });
  return globalMongoClient;
}

async function getDb() {
  const client = await getMongoClient();
  return client.db(DB_NAME);
}

module.exports = { getDb, getMongoClient };
