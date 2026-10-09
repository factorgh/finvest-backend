import express from "express";

import {
  deleteMe,
  deleteUser,
  getAll,
  getAllAdmin,
  updateMe,
  updateUser,
  getSeenTours,
  markTourSeen,
  resetSeenTours,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verification.js";

const router = express.Router();

// tour routes
router.get("/tours", verifyToken, getSeenTours);
router.post("/tours/seen", verifyToken, markTourSeen);
router.post("/tours/reset", verifyToken, resetSeenTours);

// user routes
router.get("/", getAll);
router.get("/admin", getAllAdmin);
router.patch("/updateMe", verifyToken, updateMe);
router.delete("/deleteMe", verifyToken, deleteMe);

// OTHER routes

router.put("/single/:id", updateUser);
router.delete("/single/:id", deleteUser);

export default router;
