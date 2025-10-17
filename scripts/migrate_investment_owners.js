import dotenv from "dotenv";
import mongoose from "mongoose";
import Investment from "../features/investment/model/investment.model.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function connect() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set in environment");
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
}

async function run() {
  try {
    await connect();
    const cursor = Investment.find({ $or: [ { owners: { $exists: false } }, { owners: { $size: 0 } } ] }).cursor();
    let updated = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const primaryUser = doc.userId;
      if (!primaryUser) continue;
      doc.owners = [{ user: primaryUser, role: "primary" }];
      doc.isJoint = false;
      await doc.save({ validateBeforeSave: false });
      updated += 1;
    }
    console.log(`Migration complete. Updated ${updated} investment(s).`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed", err);
    process.exit(1);
  }
}

run();
