import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../features/auth/models/user.model.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function connect() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set in environment");
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
}

async function ensureUser(user) {
  const existing = await User.findOne({ email: user.email });
  if (existing) return existing;
  return await User.create(user);
}

async function run() {
  try {
    await connect();

    const superadmin = {
      name: "superadmin",
      displayName: "Super Admin",
      email: "superadmin@lynchpinglobal.com",
      password: "SuperAdmin@12345",
      passwordConfirm: "SuperAdmin@12345",
      role: "superadmin",
    };

    const admins = [
      {
        name: "admin1",
        displayName: "Admin One",
        email: "admin1@lynchpinglobal.com",
        password: "Admin@12345",
        passwordConfirm: "Admin@12345",
        role: "admin",
      },
      {
        name: "admin2",
        displayName: "Admin Two",
        email: "admin2@lynchpinglobal.com",
        password: "Admin@12345",
        passwordConfirm: "Admin@12345",
        role: "admin",
      },
      {
        name: "admin3",
        displayName: "Admin Three",
        email: "admin3@lynchpinglobal.com",
        password: "Admin@12345",
        passwordConfirm: "Admin@12345",
        role: "admin",
      },
      {
        name: "admin4",
        displayName: "Admin Four",
        email: "admin4@lynchpinglobal.com",
        password: "Admin@12345",
        passwordConfirm: "Admin@12345",
        role: "admin",
      },
    ];

    await ensureUser(superadmin);
    for (const a of admins) {
      await ensureUser(a);
    }

    console.log("Seeding complete: superadmin + 4 admins ensured");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed", err);
    process.exit(1);
  }
}

run();
