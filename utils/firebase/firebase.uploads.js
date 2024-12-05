// import express from "express";
// import multer from "multer";
// import bucket from "./firebaseConfig.js";
// const router = express.Router();

// const upload = multer({ storage: multer.memoryStorage() }); // In-memory storage for quick access

// router.post("/upload-to-firebase", upload.array("files"), async (req, res) => {
//   try {
//     const files = req.files;
//     const urls = [];

//     for (const file of files) {
//       const fileName = `${Date.now()}-${file.originalname}`;
//       const blob = bucket.file(fileName);

//       const stream = blob.createWriteStream({
//         metadata: { contentType: file.mimetype },
//       });

//       stream.on("error", (err) => {
//         console.error(err);
//         res.status(500).send({ success: false, message: "Upload failed" });
//       });

//       stream.on("finish", async () => {
//         await blob.makePublic(); // Make the file publicly accessible
//         urls.push(`https://storage.googleapis.com/${bucket.name}/${fileName}`);
//       });

//       stream.end(file.buffer);
//     }

//     res.status(200).send({ success: true, urls });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ success: false, message: "Error uploading files" });
//   }
// });

// export default router;
