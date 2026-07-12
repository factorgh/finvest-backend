import { verifyToken } from "../auth/middleware/verification.js";
import {
  createWithdrawal,
  deleteWithdrawal,
  getAllWithdrawals,
  getUserWithdrawals,
  getWithdrawal,
  updateWithdrawal,
} from "./withdrawal.controller.js";

import express from "express";
const router = express.Router();

// Withdrawals routes
router.get("/", getAllWithdrawals);
router.get("/user", verifyToken, getUserWithdrawals); // Get withdrawals by user ID
router.post("/", verifyToken, createWithdrawal);
router.get("/single/:id", getWithdrawal);
router.put("/single/:id", verifyToken, updateWithdrawal);
router.delete("/single/:id", verifyToken, deleteWithdrawal);

export default router;
