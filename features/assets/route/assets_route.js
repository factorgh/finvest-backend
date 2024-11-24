import {
  createAsset,
  deleteAsset,
  getAllAssets,
  getAsset,
  updateAsset,
} from "../controller/assets_controller.js";

import express from "express";
const router = express.Router();

// assets routes
router.get("/", getAllAssets);
router.post("/", createAsset);
router.get("/:id", getAsset);
router.patch("/:id", updateAsset);
router.delete("/:id", deleteAsset);

export default router;
