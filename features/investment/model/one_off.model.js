import mongoose from "mongoose";

// One off Schema
const OneOffSchema = new mongoose.Schema(
  {
    dateOfEntry: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, "Add-on amount is required"],
      min: [0, "Add-on amount cannot be negative"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
    },
    rate: {
      type: Number,
      required: [true, "Rate is required"],
      min: [0, "Rate cannot be negative"],
      max: [100, "Rate cannot exceed 100"],
    },
  },
  {
    timestamps: true,
  }
);

// Export Add-On Schema
export const OneOff = mongoose.model("OneOff", OneOffSchema);
