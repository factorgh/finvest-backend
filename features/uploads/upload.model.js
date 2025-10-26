import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true },
    url: { type: String, required: true },
    filename: { type: String },
    bytes: { type: Number },
    contentType: { type: String },
    category: { type: String, index: true },
    provider: { type: String, enum: ["r2", "cloudinary"], default: "r2" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Upload = mongoose.models.Upload || mongoose.model("Upload", uploadSchema);
export default Upload;
