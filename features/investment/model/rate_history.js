import mongoose from "mongoose";

const RateHistorySchema = new mongoose.Schema({
  rate: {
    type: Number,
    required: [true, "Rate is required"],
    min: [0, "Rate cannot be negative"],
    max: [100, "Rate cannot exceed 100"],
  },
  effectiveDate: {
    type: Date,
    required: [true, "Effective date is required"],
  },
});

const RateHistory = mongoose.model("RateHistory", RateHistorySchema);

export default RateHistory;
