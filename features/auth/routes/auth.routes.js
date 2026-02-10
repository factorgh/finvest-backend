import express from "express";
import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  logout,
  getProfile,
} from "../controllers/auth.controller.js";
import { protect } from "../../../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);

// Protected routes
router.post("/logout", protect, logout);
router.get("/profile", protect, getProfile);

export default router;
