import mongoose from "mongoose";

const LoanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    loanAmount: {
      type: Number,
      required: true,
    },
    overdueRate: {
      type: Number,
      required: true,
    },
    loanRate: {
      type: Number,
      required: true,
    },
    quater: {
      type: String,
      required: true,
    },
    amountDue: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "overdue", "fufilled"],
      default: "active",
    },
    overdueDate: {
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
  },
  {
    timestamps: true,
  }
);

const Loan = mongoose.model("Loan", LoanSchema);

export default Loan;
