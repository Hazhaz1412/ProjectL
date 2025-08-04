module.exports = {
  mongodb: {
    url: process.env.MONGO_URI_WRITE || "mongodb://mongo-write:27017/lung_app?replicaSet=rs0",
    databaseName: "lung_app",
    options: {
      // useNewUrlParser and useUnifiedTopology are deprecated in MongoDB Node.js Driver >= 4.x
    }
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js"
};
