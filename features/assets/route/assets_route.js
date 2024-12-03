import { verifyToken } from "../../auth/middleware/verification.js";
import {
  createAsset,
  deleteAsset,
  getAllAssets,
  getAsset,
  getAssetByUser,
  updateAsset,
} from "../controller/assets_controller.js";

import express from "express";
const router = express.Router();

// assets routes
router.get("/", getAllAssets);
router.get("/user", verifyToken, getAssetByUser);
router.post("/", createAsset);
router.get("/single/:id", getAsset);
router.put("/single/:id", updateAsset);
router.delete("/single/:id", deleteAsset);

export default router;
