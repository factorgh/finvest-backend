import express from "express";
import multer from "multer";
import cloudinary from "../cloudinary.js";
import { verifyToken } from "../../features/auth/middleware/verification.js";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import Upload from "../../features/uploads/upload.model.js";
dotenv.config();

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Upload multiple files to Cloudflare R2 (S3-compatible)

router.post("/", verifyToken, upload.array("files", 20), async (req, res) => {
  try {
    const folder = (req.body.category || "uploads").replace(/\/+$/g, "");
    console.log("[uploads] uploading to folder:", folder);
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
        console.log("[uploads] writing key:", key);

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
          filename: safeName,
          contentType: file.mimetype,
          size: file.size,
        };
      })
    );

    // persist to DB
    try {
      const docs = uploads.map((u) => ({
        key: u.key,
        url: u.url,
        filename: u.filename,
        bytes: u.size,
        contentType: u.contentType,
        category: folder,
        provider: "r2",
        user: req.user?._id,
      }));
      if (docs.length) {
        await Upload.insertMany(docs);
      }
    } catch (dbErr) {
      console.error("[uploads] failed to persist uploads:", dbErr);
    }

    return res.json({ success: true, uploads });
  } catch (error) {
    console.error("R2 upload error:", error);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
});
// List resources in a folder (category). Supports Cloudinary (default) and R2 via provider=r2
router.get("/list", async (req, res) => {
  try {
    const folder = (req.query.category || "uploads")
      .toString()
      .replace(/\/+$/g, "");
    const provider = (req.query.provider || "cloudinary").toString();

    // 1) DB-first: if we have records, return them for immediate consistency
    try {
      const dbQuery = {
        category: new RegExp(
          `^${folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i"
        ),
      };
      if (provider && provider !== "any") dbQuery.provider = provider;
      const docs = await Upload.find(dbQuery).sort({ createdAt: -1 }).lean();
      if (docs && docs.length) {
        const files = docs.map((d) => ({
          url: d.url,
          public_id: d.key,
          resource_type: "raw",
          format: (d.filename || "").split(".").pop(),
          bytes: d.bytes,
          created_at: d.createdAt,
          filename: d.filename,
        }));
        return res.json({ success: true, files });
      }
    } catch (e) {
      console.warn(
        "[uploads] DB-first list failed, falling back to provider:",
        e?.message || e
      );
    }

    if (provider === "r2") {
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

      const prefix = `${folder}/`;
      console.log("[uploads] listing prefix:", prefix);
      let list;
      try {
        list = await r2.send(
          new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix })
        );
      } catch (e) {
        if (e && (e.Code === "NoSuchKey" || e.name === "NoSuchKey")) {
          return res.json({ success: true, files: [] });
        }
        throw e;
      }

      const base = R2_PUBLIC_BASE_URL.replace(/\/$/, "");
      const bucketSegment = `/${R2_BUCKET}`;
      const baseWithBucket = base.endsWith(bucketSegment)
        ? base
        : `${base}${bucketSegment}`;

      const inferTypeAndFormat = (key) => {
        const m = key.match(/\.([a-zA-Z0-9]+)$/);
        const ext = (m?.[1] || "").toLowerCase();
        const imageExt = new Set([
          "jpg",
          "jpeg",
          "png",
          "gif",
          "webp",
          "svg",
          "bmp",
        ]);
        const videoExt = new Set(["mp4", "webm", "mov", "mkv", "avi"]);
        let resource_type = "raw";
        if (imageExt.has(ext)) resource_type = "image";
        else if (videoExt.has(ext)) resource_type = "video";
        return { resource_type, format: ext };
      };

      const files = (list.Contents || [])
        .filter((o) => o.Key && o.Key !== prefix)
        .map((o) => {
          const url = `${baseWithBucket}/${o.Key}`;
          const key = o.Key;
          const name = key.split("/").pop();
          const { resource_type, format } = inferTypeAndFormat(key);
          return {
            url,
            public_id: key,
            resource_type,
            format,
            bytes: o.Size,
            created_at: o.LastModified,
            filename: name,
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // 2) Best-effort: backfill DB so future reads are consistent
      try {
        if (files.length) {
          const ops = files.map((f) => ({
            updateOne: {
              filter: { key: f.public_id },
              update: {
                $setOnInsert: {
                  key: f.public_id,
                  createdAt: f.created_at,
                },
                $set: {
                  url: f.url,
                  filename: f.filename,
                  bytes: f.bytes,
                  contentType: undefined,
                  category: folder,
                  provider: "r2",
                  updatedAt: new Date(),
                },
              },
              upsert: true,
            },
          }));
          await Upload.bulkWrite(ops, { ordered: false });
        }
      } catch (e) {
        console.warn(
          "[uploads] backfill DB from R2 listing failed:",
          e?.message || e
        );
      }

      return res.json({ success: true, files });
    }

    // Default: Cloudinary
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
    console.error("List error:", error);
    res.status(500).json({ success: false, message: "Failed to list files" });
  }
});

// Fetch persisted uploads from DB (authoritative)
router.get("/db", async (req, res) => {
  try {
    const category = (req.query.category || "uploads").toString();
    const provider = (req.query.provider || "").toString();
    const query = {
      category: new RegExp(
        `^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      ),
    };
    if (provider && provider !== "any") {
      query.provider = provider;
    }
    const docs = await Upload.find(query).sort({ createdAt: -1 }).lean();
    console.log("[uploads:/db] query=", query, "count=", docs?.length || 0);
    const files = (docs || []).map((d) => ({
      url: d.url,
      public_id: d.key,
      resource_type: "raw", // PDFs for conditions; adjust if needed
      format: (d.filename || "").split(".").pop(),
      bytes: d.bytes,
      created_at: d.createdAt,
      filename: d.filename,
    }));
    return res.json({ success: true, files });
  } catch (error) {
    console.error("DB list error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list stored uploads" });
  }
});

// Delete a resource by public_id
router.delete("/", verifyToken, async (req, res) => {
  try {
    const { public_id, resource_type: resourceType, provider } = req.query;
    if (!public_id) {
      return res
        .status(400)
        .json({ success: false, message: "public_id is required" });
    }

    // If provider is r2, delete from R2 bucket
    if ((provider || "").toString() === "r2") {
      try {
        const R2_ENDPOINT = process.env.R2_ENDPOINT;
        const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
        const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
        const R2_BUCKET = process.env.R2_BUCKET;
        const missing = [
          ["R2_ENDPOINT", R2_ENDPOINT],
          ["R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID],
          ["R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY],
          ["R2_BUCKET", R2_BUCKET],
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

        await r2.send(
          new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: String(public_id) })
        );
        // remove from DB if present
        await Upload.deleteOne({ key: String(public_id) });
        return res.json({ success: true, provider: "r2" });
      } catch (err) {
        console.error("R2 delete error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Failed to delete R2 object" });
      }
    }

    const tryTypes = resourceType
      ? [String(resourceType)]
      : ["image", "video", "raw"];

    let lastError = null;
    for (const type of tryTypes) {
      try {
        const result = await cloudinary.uploader.destroy(String(public_id), {
          resource_type: type,
        });
        if (result?.result === "ok" || result?.result === "not found") {
          // best-effort clean up in DB if exists
          await Upload.deleteOne({ key: String(public_id) });
          return res.json({
            success: true,
            resource_type: type,
            result: result?.result,
          });
        }
        // If Cloudinary returns other result, continue trying next type
        lastError = new Error(
          `Unexpected result: ${result?.result || "unknown"}`
        );
      } catch (err) {
        // Continue to next type on error (e.g., invalid resource type)
        lastError = err;
      }
    }

    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to delete resource",
        error: String(lastError?.message || lastError),
      });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

export default router;

console.log("uploads route");
