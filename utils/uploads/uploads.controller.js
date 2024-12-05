// // File upload endpoint
// const uploadToS3 = (req, res) => {
//   try {
//     const fileUrls = req.files.map((file) => file.location); // Get file URLs from S3
//     res.json({ success: true, urls: fileUrls });
//   } catch (error) {
//     console.error("Error uploading to S3:", error);
//     res.status(500).json({ success: false, message: "Error uploading files" });
//   }
// };

// export default uploadToS3; // Upload
