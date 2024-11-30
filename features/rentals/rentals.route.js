import {
  createRental,
  deleteRental,
  getAllRentals,
  getRental,
  updateRental,
} from "./rentals.controller.js";

import express from "express";
const router = express.Router();

// Rentals routes
router.get("/", getAllRentals);
router.post("/", createRental);
router.get("/single/:id", getRental);
router.put("/single/:id", updateRental);
router.delete("/single/:id", deleteRental);

export default router;
