import mongoose from "mongoose";

const AssetsSchema = new mongoose.Schema(
  {
    assetClass: {
      type: String,
      required: true,
    },
    assetDesignation: {
      type: Number,
      required: true,
    },
    accruedInterest: {
      type: Number,
      required: true,
    },
    assetImage: {
      type: String,
      required: true,
    },
    quater: {
      type: String,
      required: true,
      enum: ["Q1", "Q2", "Q3", "Q4"],
    },
    maturityDate: {
      type: Date,
      required: true,
      validate: [validateMaturityDate, "Invalid maturity date"],
    },
    pdf: {
      type: Array,
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

function validateMaturityDate(maturityDate) {
  const now = new Date();
  return maturityDate <= now;
}

const Assets = mongoose.model("Assets", AssetsSchema);

export default Assets;
