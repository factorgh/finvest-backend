import mongoose from "mongoose";

const AssetsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assetName: {
      type: String,
      required: true,
    },
    assetClass: {
      type: String,
      required: true,
    },
    assetValue: {
      type: Number,
      required: true,
    },
    assetDesignation: {
      type: String,
      required: true,
    },
    accruedInterest: {
      type: Number,
      required: true,
    },
    maturityDate: {
      type: Date,
      required: true,
    },
    managementFee: {
      type: Number,
    },

    quater: {
      type: String,
      required: true,
      enum: ["Q1", "Q2", "Q3", "Q4"],
    },
    assetImage: {
      type: String,
    },
    timeCourse: {
      type: String,
      required: true,
    },

    mandate: {
      type: Array,
      default: [],
    },
    certificate: {
      type: Array,
      default: [],
    },
    partnerForm: {
      type: Array,
      default: [],
    },
    checklist: {
      type: Array,
      default: [],
    },
    others: {
      type: Array,
      default: [],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    deduction: {
      type: Number,
      default: 0,
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
