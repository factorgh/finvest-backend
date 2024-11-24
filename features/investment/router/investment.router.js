import express from "express";
import {
  createInvestment,
  getAllInvestments,
} from "../controller/investment.controller.js";

const router = express.Router();

// investment routes
router.get("/", getAllInvestments);
router.post("/", createInvestment);
// router.get("/:id", getOne);
// router.patch("/:id", updateOne);
// router.delete("/:id", deleteOne);

export default router;
