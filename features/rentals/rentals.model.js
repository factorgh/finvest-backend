import mongoose from "mongoose";

const rentalsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assetClass: {
      type: String,
      required: true,
    },

    assetDesignation: {
      type: String,
      required: true,
    },

    amountDue: {
      type: Number,
      required: true,
    },
    overdueFee: {
      type: Number,
      required: true,
    },
    overdueDays: {
      type: Number,
    },
    quater: {
      type: String,
      required: true,
      enum: ["Q1", "Q2", "Q3", "Q4"],
    },

    returnDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    agreements: {
      type: Array,
      default: [],
    },
    others: {
      type: Array,
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Rental = mongoose.model("Rental", rentalsSchema);
export default Rental;
