import { verifyToken } from "../auth/middleware/verification.js";
import {
  createRental,
  deleteRental,
  getAllRentals,
  getRental,
  getUserRentals,
  updateRental,
} from "./rentals.controller.js";

import express from "express";
const router = express.Router();

// Rentals routes
router.get("/", getAllRentals);
router.get("/user", verifyToken, getUserRentals); // Get rentals by user ID
router.post("/", createRental);
router.get("/single/:id", getRental);
router.put("/single/:id", updateRental);
router.delete("/single/:id", deleteRental);

export default router;
