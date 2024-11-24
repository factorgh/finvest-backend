import mongoose from "mongoose";

const JobStatusSchema = new mongoose.Schema({
  jobName: {
    type: String,
    required: true,
    unique: true,
  },
  lastRun: {
    type: Date,
    required: true,
  },
});

const JobStatus = mongoose.model("JobStatus", JobStatusSchema);

export default JobStatus;
