import express from "express";
import {
  addAddOnToInvestment,
  updateAddOnStatus,
  deleteAddOn,
} from "../controller/add_on_controller.js";

const router = express.Router();

// investment routes
// router.get("/", getAll);
router.post("/", addAddOnToInvestment);
// router.get("/:id", getOne);
router.put("/single/:id", updateAddOnStatus);
router.delete("/single/:id", deleteAddOn);

export default router;
