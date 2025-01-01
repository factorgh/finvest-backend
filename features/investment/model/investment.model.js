import { model, mongoose } from "mongoose";

const InvestmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,

      trim: true,
    },
    principal: {
      type: Number,
      required: [true, "Principal amount is required"],
      min: [0, "Principal cannot be negative"],
    },
    guaranteedRate: {
      type: Number,
      required: [true, "Guaranteed rate is required"],
      min: [0, "Rate cannot be negative"],
      max: [100, "Rate cannot exceed 100"],
      default: 8,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    addOns: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AddOn",
      },
    ],
    oneOffs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OneOff",
      },
    ],
    principalAccruedReturn: {
      type: Number,
      default: 0,
      min: [0, "Cannot be negative"],
    },
    addOnAccruedReturn: {
      type: Number,
      default: 0,
      min: [0, "Cannot be negative"],
    },
    oneOffAccruedReturn: {
      type: Number,
      default: 0,
      min: [0, "Cannot be negative"],
    },
    totalAccruedReturn: {
      type: Number,
      default: 0,
      min: [0, "Cannot be negative"],
    },
    quarterEndDate: {
      type: Date,
      default: function () {
        const now = new Date();
        const quarterEndMonth = Math.ceil((now.getMonth() + 1) / 3) * 3;
        return new Date(now.getFullYear(), quarterEndMonth, 0);
      },
    },

    quarter: { type: String, required: true, enum: ["Q1", "Q2", "Q3", "Q4"] },
    archived: { type: Boolean, default: false, select: false },
    active: { type: Boolean, default: true, select: false },
    previousTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Investment",
    },
    managementFee: { type: Number, default: 0, min: [0, "Cannot be negative"] },
    managementFeeRate: {
      type: Number,
      default: 0,
      min: [0, "Cannot be negative"],
    },
    performanceYield: {
      type: Number,
      default: 0,
      min: [0, "Cannot be negative"],
    },
    certificate: { type: Array, default: [] },
    checklist: { type: Array, default: [] },
    mandate: { type: Array, default: [] },
    partnerForm: { type: Array, default: [] },
    others: { type: Array, default: [] },
    lastModified: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);
InvestmentSchema.index({ userId: 1 });
InvestmentSchema.index({ quarter: 1 });
InvestmentSchema.index({ transactionId: 1 }, { unique: true });

const Investment = model("Investment", InvestmentSchema);

export default Investment;
