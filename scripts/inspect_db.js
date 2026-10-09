import mongoose from "mongoose";

const directUri = "mongodb://burchellsbale:Rosemondlamptey@finvest-shard-00-00.1lmxi.mongodb.net:27017,finvest-shard-00-01.1lmxi.mongodb.net:27017,finvest-shard-00-02.1lmxi.mongodb.net:27017/?ssl=true&replicaSet=atlas-58vxmq-shard-0&authSource=admin&retryWrites=true&w=majority";

async function listDbs() {
  try {
    await mongoose.connect(directUri, { serverSelectionTimeoutMS: 15000 });
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log("Databases on cluster:");
    for (const dbInfo of dbs.databases) {
      console.log(` - ${dbInfo.name} (${dbInfo.sizeOnDisk} bytes)`);
      const client = mongoose.connection.getClient();
      const currentDb = client.db(dbInfo.name);
      const cols = await currentDb.listCollections().toArray();
      for (const col of cols) {
        const count = await currentDb.collection(col.name).countDocuments();
        console.log(`     * ${col.name}: ${count}`);
      }
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

listDbs();
