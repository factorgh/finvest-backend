import { verifyToken } from "../auth/middleware/verification.js";
import {
  createLoan,
  deleteLoan,
  getAllLoans,
  getLoan,
  getUserLoans,
  updateLoan,
} from "./loans.controller.js";

import express from "express";
const router = express.Router();

// Loans routes
router.get("/", getAllLoans);
router.get("/user", verifyToken, getUserLoans);
router.post("/", createLoan);
router.get("/single/:id", getLoan);
router.put("/single/:id", updateLoan);
router.delete("/single/:id", deleteLoan);

export default router;
