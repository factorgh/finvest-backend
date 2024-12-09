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
    overdueFee: {
      type: Number,
      default: 0,
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
      default: 0,
    },
    overdueDays: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    dueDate: {
      type: Date,
      required: true,
    },

    agreements: {
      type: Array,
      default: [],
    },
    others: {
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
