import express from "express";
import { verifyToken } from "../../auth/middleware/verification.js";
import {
  createInvestment,
  deleteInvestment,
  getAllInvestments,
  getInvestment,
  updateInvestment,
} from "../controller/investment.controller.js";

const router = express.Router();

// investment routes
router.get("/", getAllInvestments);
router.post("/", createInvestment);
// router.get("/:id", getOne);
router.put("/single/:id", verifyToken, updateInvestment);
router.delete("/single/:id", verifyToken, deleteInvestment);
router.get("/user", verifyToken, getInvestment);

export default router;
