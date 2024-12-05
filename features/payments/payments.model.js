import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    requestedDate: {
      type: Date,
      required: true,
    },
    approvedDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Processing", "Cancelled"],
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
