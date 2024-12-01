import {
  createWithdrawal,
  deleteWithdrawal,
  getAllWithdrawals,
  getWithdrawal,
  updateWithdrawal,
} from "./withdrawal.controller.js";

import express from "express";
const router = express.Router();

// Withdrawals routes
router.get("/", getAllWithdrawals);
router.post("/", createWithdrawal);
router.get("/single/:id", getWithdrawal);
router.put("/single/:id", updateWithdrawal);
router.delete("/single/:id", deleteWithdrawal);

export default router;
