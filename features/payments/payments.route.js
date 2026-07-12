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
router.post("/", verifyToken, createPayment);
router.get("/single/:id", getPayment);
router.put("/single/:id", verifyToken, updatePayment);
router.delete("/single/:id", verifyToken, deletePayment);

export default router;
