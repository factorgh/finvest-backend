import express from "express";

import {
  deleteMe,
  getAll,
  getAllAdmin,
  updateMe,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verification.js";

const router = express.Router();

// user routes
router.get("/", getAll);
router.get("/admin", getAllAdmin);
router.patch("/updateMe", verifyToken, updateMe);
router.delete("/deleteMe", verifyToken, deleteMe);

export default router;
