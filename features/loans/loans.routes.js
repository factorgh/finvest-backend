import {
  createLoan,
  deleteLoan,
  getAllLoans,
  getLoan,
  updateLoan,
} from "./loans.controller.js";

import express from "express";
const router = express.Router();

// Loans routes
router.get("/", getAllLoans);
router.post("/", createLoan);
router.get("/single/:id", getLoan);
router.put("/single/:id", updateLoan);
router.delete("/single/:id", deleteLoan);

export default router;
