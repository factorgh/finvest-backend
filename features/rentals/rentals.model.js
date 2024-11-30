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
      type: Number,
      required: true,
    },

    amountDue: {
      type: Number,
      required: true,
    },
    overdueRate: {
      type: Number,
      required: true,
    },
    quater: {
      type: String,
      required: true,
      enum: ["Q1", "Q2", "Q3", "Q4"],
    },
    overdueDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
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
