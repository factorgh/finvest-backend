import mongoose from "mongoose";

// Add-On Schema
const AddOnSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    accruedAddOnInterest: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
    },
    rate: {
      type: Number,
      required: [true, "Rate is required"],
      min: [0, "Rate cannot be negative"],
      max: [100, "Rate cannot exceed 100"],
      default: function () {
        return this.guaranteedRate;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Export Add-On Schema
export const AddOn = mongoose.model("AddOn", AddOnSchema);
