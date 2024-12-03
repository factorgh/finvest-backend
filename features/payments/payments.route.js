import { verifyToken } from "../auth/middleware/verification.js";
import {
  createPayment,
  deletePayment,
  getAllPayments,
  getPayment,
  getUserPayments,
  updatePayment,
} from "./payments.controller.js";

import express from "express";
const router = express.Router();

// Payments routes
router.get("/", getAllPayments);
router.get("/user", verifyToken, getUserPayments); // Get payments by user ID
router.post("/", createPayment);
router.get("/single/:id", getPayment);
router.put("/single/:id", updatePayment);
router.delete("/single/:id", deletePayment);

export default router;
