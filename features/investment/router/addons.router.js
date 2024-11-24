import express from "express";
import { addAddOnToInvestment } from "../controller/add_on_controller.js";

const router = express.Router();

// investment routes
// router.get("/", getAll);
router.post("/:investmentId", addAddOnToInvestment);
// router.get("/:id", getOne);
// router.patch("/:id", updateOne);
// router.delete("/:id", deleteOne);

export default router;
