// import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import express from "express";
// import multer from "multer";

// const router = express.Router();

// // AWS SDK v3 S3 client
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION_NAME,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// // Custom multer storage engine to upload files to S3 using AWS SDK v3
// const multerStorage = multer.memoryStorage(); // Store files in memory for direct upload to S3

// const upload = multer({ storage: multerStorage });

// // Function to generate a presigned URL for a file
// const generatePresignedUrl = async (fileName, folder) => {
//   try {
//     const command = new PutObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `${folder}/${Date.now()}-${fileName}`,
//       ACL: "public-read",
//     });

//     const presignedUrl = await getSignedUrl(s3Client, command, {
//       expiresIn: 3600,
//     });
//     return presignedUrl;
//   } catch (error) {
//     console.error("Error generating presigned URL:", error);
//     throw error;
//   }
// };

// // Endpoint to handle file uploads and return presigned URLs
// router.post("/upload-to-s3", upload.array("files", 10), async (req, res) => {
//   try {
//     const fileUrls = [];

//     // Generate presigned URLs for each file in the request
//     for (const file of req.files) {
//       const fileName = file.originalname; // Use original file name or modify it
//       const folder = req.body.category || "uploads"; // Dynamic folder based on the category

//       // Generate presigned URL for each file
//       const presignedUrl = await generatePresignedUrl(fileName, folder);

//       fileUrls.push({ presignedUrl, fileName });
//     }

//     // Send presigned URLs back to the frontend
//     res.json({
//       success: true,
//       urls: fileUrls,
//     });
//   } catch (error) {
//     console.error("Error uploading to S3:", error);
//     res.status(500).json({ success: false, message: "Error uploading files" });
//   }
// });

// export default router;
