import express from "express";
import { verifyToken } from "../../auth/middleware/verification.js";
import {
  createInvestment,
  deleteInvestment,
  getAllInvestments,
  getUserInvestments,
  updateInvestment,
} from "../controller/investment.controller.js";

const router = express.Router();

// investment routes
router.get("/", getAllInvestments);
router.post("/", createInvestment);
// router.get("/:id", getOne);
router.put("/single/:id", updateInvestment);
router.delete("/single/:id", deleteInvestment);
router.get("/user", verifyToken, getUserInvestments);

export default router;
