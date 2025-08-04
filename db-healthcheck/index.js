const { MongoClient } = require('mongodb');
const express = require('express');
const app = express();
const port = 3000;

const uriWrite = process.env.MONGO_URI_WRITE || 'mongodb://mongo-write:27017/mydb?replicaSet=rs0';
const uriRead = process.env.MONGO_URI_READ || 'mongodb://mongo-read:27017/mydb?replicaSet=rs0';

async function checkConnection(uri) {
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    await client.connect();
    await client.db().command({ ping: 1 });
    await client.close();
    return true;
  } catch (e) {
    return false;
  }
}

app.get('/health', async (req, res) => {
  const writeOk = await checkConnection(uriWrite);
  const readOk = await checkConnection(uriRead);
  res.json({
    write: writeOk ? 'ok' : 'fail',
    read: readOk ? 'ok' : 'fail'
  });
});

app.listen(port, () => {
  console.log(`DB Healthcheck listening on port ${port}`);
});
