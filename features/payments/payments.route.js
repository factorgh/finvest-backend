import {
  createPayment,
  deletePayment,
  getAllPayments,
  getPayment,
  updatePayment,
} from "./payments.controller.js";

import express from "express";
const router = express.Router();

// Payments routes
router.get("/", getAllPayments);
router.post("/", createPayment);
router.get("/single/:id", getPayment);
router.patch("/single/:id", updatePayment);
router.delete("/single/:id", deletePayment);

export default router;
