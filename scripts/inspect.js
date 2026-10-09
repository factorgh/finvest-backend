import dns from "node:dns";
dns.setServers(["8.8.8.8"]);

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

async function run() {
  try {
    console.log("Connecting to:", process.env.MONGODB_URI ? "URI found" : "No URI");
    await mongoose.connect(process.env.MONGODB_URI, {
      family: 4,
      serverSelectionTimeoutMS: 15000,
    });
    console.log("MongoDB connected!");

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("\n--- COLLECTION COUNTS ---");
    for (const c of collections) {
      const count = await mongoose.connection.db.collection(c.name).countDocuments();
      console.log(`${c.name}: ${count}`);
    }
    console.log("-------------------------\n");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
