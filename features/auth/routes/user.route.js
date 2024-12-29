import express from "express";

import {
  deleteMe,
  deleteUser,
  getAll,
  getAllAdmin,
  updateMe,
  updateUser,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verification.js";

const router = express.Router();

// user routes
router.get("/", getAll);
router.get("/admin", getAllAdmin);
router.patch("/updateMe", verifyToken, updateMe);
router.delete("/deleteMe", verifyToken, deleteMe);

// OTHER routes

router.put("/single/:id", updateUser);
router.delete("/single/:id", deleteUser);

export default router;
