module.exports = {
  mongodb: {
    url: "mongodb://localhost:27017",
    databaseName: "lung_app",
    options: {
      useNewUrlParser: true, 
      useUnifiedTopology: true  
    }
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js"
};
