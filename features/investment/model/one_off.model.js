import mongoose from "mongoose";

// One off Schema
const OneOffSchema = new mongoose.Schema(
  {
    dateOfEntry: {
      type: Date,

      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, "Add-on amount is required"],
      min: [0, "Add-on amount cannot be negative"],
    },
    currency: {
      type: String,
    },
    // rate: {
    //   type: Number,
    //   required: [true, "Rate is required"],
    //   min: [0, "Rate cannot be negative"],
    //   max: [100, "Rate cannot exceed 100"],
    // },
    oneOffYield: {
      type: Number,
      required: [true, "Yield is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Export Add-On Schema
export const OneOff = mongoose.model("OneOff", OneOffSchema);
