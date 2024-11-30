import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
  },
  RequestedDate: {
    type: Date,
    required: true,
  },
  ApprovedDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Processing", "Cancelled"],
  },
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
