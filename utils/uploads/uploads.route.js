import express from "express";
import multer from "multer";
import cloudinary from "../cloudinary.js";
import { verifyToken } from "../../features/auth/middleware/verification.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Upload multiple files to Cloudflare R2 (S3-compatible)

router.post("/", verifyToken, upload.array("files", 20), async (req, res) => {
  try {
    const folder = (req.body.category || "uploads").replace(/\/+$/g, "");
    const R2_ENDPOINT = process.env.R2_ENDPOINT;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET = process.env.R2_BUCKET;
    const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;
    const missing = [
      ["R2_ENDPOINT", R2_ENDPOINT],
      ["R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID],
      ["R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY],
      ["R2_BUCKET", R2_BUCKET],
      ["R2_PUBLIC_BASE_URL", R2_PUBLIC_BASE_URL],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) {
      return res.status(500).json({
        success: false,
        message: `R2 not configured: missing ${missing.join(", ")}`,
      });
    }
    const r2 = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    const uploads = await Promise.all(
      (req.files || []).map(async (file) => {
        const safeName = (file.originalname || `file-${Date.now()}`).replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );
        const key = `${folder}/${Date.now()}-${safeName}`;

        await r2.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ContentDisposition: "inline",
          })
        );

        const base = R2_PUBLIC_BASE_URL.replace(/\/$/, "");
        const bucketSegment = `/${R2_BUCKET}`;
        const baseWithBucket = base.endsWith(bucketSegment)
          ? base
          : `${base}${bucketSegment}`;
        const url = `${baseWithBucket}/${key}`;
        return {
          url,
          key,
          contentType: file.mimetype,
          size: file.size,
        };
      })
    );

    return res.json({ success: true, uploads });
  } catch (error) {
    console.error("R2 upload error:", error);
    return res.status(500).json({ success: false, message: "Upload failed" });
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
      return res
        .status(400)
        .json({ success: false, message: "public_id is required" });
    }
    const result = await cloudinary.uploader.destroy(String(public_id), {
      resource_type: "auto",
    });
    if (result?.result !== "ok" && result?.result !== "not found") {
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete resource" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

export default router;

console.log("uploads route");
