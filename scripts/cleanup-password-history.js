import "dotenv/config";
import mongoose from "mongoose";
import User from "../features/auth/models/user.model.js";
import bcrypt from "bcryptjs";

/**
 * Clean up corrupted password history
 * This script removes plaintext passwords from history and keeps only valid hashed passwords
 */
const cleanupPasswordHistory = async () => {
  try {
    console.log("Starting password history cleanup...");

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database");

    // Find all users with password history
    const users = await User.find({
      passwordHistory: { $exists: true, $ne: [] },
    });

    console.log(`Found ${users.length} users with password history`);

    let cleanedCount = 0;
    let totalCorrupted = 0;

    for (const user of users) {
      const originalHistory = user.passwordHistory;
      let corruptedCount = 0;

      // Filter out corrupted entries (plaintext passwords)
      const cleanedHistory = user.passwordHistory.filter((entry) => {
        const isHashed = entry.hash && entry.hash.startsWith("$2a$");
        if (!isHashed) {
          corruptedCount++;
          return false;
        }
        return true;
      });

      if (corruptedCount > 0) {
        console.log(
          `User ${user.email}: Found ${corruptedCount} corrupted entries`,
        );
        totalCorrupted += corruptedCount;

        // Update user with cleaned history
        user.passwordHistory = cleanedHistory;
        await user.save({ validateBeforeSave: false });
        cleanedCount++;

        console.log(`✅ Cleaned password history for ${user.email}`);
      }
    }

    console.log(`\n🎉 Cleanup Complete:`);
    console.log(`- Users processed: ${users.length}`);
    console.log(`- Users cleaned: ${cleanedCount}`);
    console.log(`- Total corrupted entries removed: ${totalCorrupted}`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
};

/**
 * Verify password history integrity
 */
const verifyPasswordHistory = async () => {
  try {
    console.log("Starting password history verification...");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database");

    const users = await User.find({
      passwordHistory: { $exists: true, $ne: [] },
    });

    console.log(`Verifying ${users.length} users with password history`);

    let issues = 0;

    for (const user of users) {
      const corruptedEntries = user.passwordHistory.filter(
        (entry) => !entry.hash || !entry.hash.startsWith("$2a$"),
      );

      if (corruptedEntries.length > 0) {
        console.log(
          `❌ User ${user.email} has ${corruptedEntries.length} corrupted entries`,
        );
        issues++;
      }
    }

    if (issues === 0) {
      console.log("✅ All password histories are clean!");
    } else {
      console.log(`❌ Found issues in ${issues} users`);
    }
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the script
if (process.argv.includes("--verify")) {
  verifyPasswordHistory();
} else {
  cleanupPasswordHistory();
}
