import express from "express";
import {
  addAddOnToInvestment,
  updateAddOnStatus,
} from "../controller/add_on_controller.js";

const router = express.Router();

// investment routes
// router.get("/", getAll);
router.post("/", addAddOnToInvestment);
// router.get("/:id", getOne);
router.patch("/single/:addOnId", updateAddOnStatus);
// router.delete("/:id", deleteOne);

export default router;
