import express from "express";
import multer from "multer";
import cloudinary from "../cloudinary.js";
import { verifyToken } from "../../features/auth/middleware/verification.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Upload multiple files to Cloudinary
router.post("/", verifyToken, upload.array("files", 20), async (req, res) => {
  try {
    const folder = req.body.category || "uploads";
    const uploads = await Promise.all(
      (req.files || []).map(
        (file) =>
          new Promise((resolve, reject) => {
            const resourceType = file.mimetype === "application/pdf" ? "raw" : "auto";
            const stream = cloudinary.uploader.upload_stream(
              { folder, resource_type: resourceType },
              (error, result) => {
                if (error) return reject(error);
                return resolve({
                  url: result?.secure_url,
                  public_id: result?.public_id,
                  resource_type: result?.resource_type,
                });
              }
            );
            stream.end(file.buffer);
          })
      )
    );
    res.json({ success: true, urls: uploads });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// List resources in a folder (category) from Cloudinary
router.get("/list", async (req, res) => {
  try {
    const folder = req.query.category || "uploads";
    // Using Cloudinary search API for flexibility
    const result = await cloudinary.search
      .expression(`folder:${folder}/*`)
      .sort_by("created_at", "desc")
      .max_results(100)
      .execute();
    const files = (result?.resources || []).map((r) => ({
      url: r.secure_url || r.url,
      public_id: r.public_id,
      resource_type: r.resource_type,
      format: r.format,
      bytes: r.bytes,
      created_at: r.created_at,
      filename: r.filename,
    }));
    res.json({ success: true, files });
  } catch (error) {
    console.error("Cloudinary list error:", error);
    res.status(500).json({ success: false, message: "Failed to list files" });
  }
});

// Delete a resource by public_id
router.delete("/", verifyToken, async (req, res) => {
  try {
    const { public_id } = req.query;
    if (!public_id) {
      return res.status(400).json({ success: false, message: "public_id is required" });
    }
    const result = await cloudinary.uploader.destroy(String(public_id), { resource_type: "auto" });
    if (result?.result !== "ok" && result?.result !== "not found") {
      return res.status(500).json({ success: false, message: "Failed to delete resource" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

export default router;
