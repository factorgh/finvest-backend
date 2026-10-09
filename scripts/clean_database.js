import mongoose from "mongoose";

const directUri =
  "mongodb://burchellsbale:Rosemondlamptey@finvest-shard-00-00.1lmxi.mongodb.net:27017,finvest-shard-00-01.1lmxi.mongodb.net:27017,finvest-shard-00-02.1lmxi.mongodb.net:27017/test?ssl=true&replicaSet=atlas-58vxmq-shard-0&authSource=admin&retryWrites=true&w=majority";

async function cleanDatabase() {
  try {
    console.log("Connecting to database 'test'...");
    await mongoose.connect(directUri, { serverSelectionTimeoutMS: 15000 });
    console.log("Connected successfully.");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("\nCollections before cleanup:");

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(` - ${col.name}: ${count} documents`);
    }

    console.log("\nCleaning non-user collections...");
    for (const col of collections) {
      // KEEP user accounts and license counters
      if (col.name === "users" || col.name === "counters") {
        console.log(` ✅ PRESERVING collection: ${col.name}`);
        continue;
      }

      const count = await db.collection(col.name).countDocuments();
      if (count > 0) {
        const result = await db.collection(col.name).deleteMany({});
        console.log(` 🗑️  DELETED ${result.deletedCount} documents from: ${col.name}`);
      } else {
        console.log(` ℹ️  ${col.name} is already empty (0 documents)`);
      }
    }

    console.log("\nCollections after cleanup:");
    const afterCols = await db.listCollections().toArray();
    for (const col of afterCols) {
      const count = await db.collection(col.name).countDocuments();
      console.log(` - ${col.name}: ${count} documents`);
    }

    await mongoose.disconnect();
    console.log("\nDatabase cleanup finished successfully! All user accounts were preserved.");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

cleanDatabase();
