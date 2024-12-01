import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema({
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
});

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
export default Withdrawal;
