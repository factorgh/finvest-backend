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
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    overdueDate: {
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
