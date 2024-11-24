import express from "express";
import { addOneOffsToInvestment } from "../controller/one_off.controller.js";

const router = express.Router();

// investment routes
// router.get("/", getAll);
router.post("/:investmentId", addOneOffsToInvestment);
// router.get("/:id", getOne);
// router.patch("/:id", updateOne);
// router.delete("/:id", deleteOne);

export default router;
