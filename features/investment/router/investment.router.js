import express from "express";
import { verifyToken } from "../../auth/middleware/verification.js";
import {
  createInvestment,
  deleteInvestment,
  getAllInvestments,
  getInvestment,
  updateInvestment,
  archiveTransactions,
  rolloverInvestments,
  getRolloverCandidates,
  executeSingleRollover,
  executeBatchRollover,
} from "../controller/investment.controller.js";

const router = express.Router();

// manual rollover routes
router.get("/rollover/candidates", verifyToken, getRolloverCandidates);
router.post("/rollover/execute-single", verifyToken, executeSingleRollover);
router.post("/rollover/execute-batch", verifyToken, executeBatchRollover);

// investment routes
router.get("/", getAllInvestments);
router.post("/", createInvestment);
// router.get("/:id", getOne);
router.put("/single/:id", verifyToken, updateInvestment);
router.delete("/single/:id", verifyToken, deleteInvestment);
router.get("/user", verifyToken, getInvestment);

router.post("/archive", verifyToken, async (req, res, next) => {
  try {
    await archiveTransactions();
    res.status(200).json({ status: "success", message: "Transactions archived successfully" });
  } catch (err) {
    next(err);
  }
});

router.post("/rollover", verifyToken, async (req, res, next) => {
  try {
    await rolloverInvestments();
    res.status(200).json({ status: "success", message: "Investments rolled over successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
