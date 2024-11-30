import {
  createActivitLog,
  deleteActivitLog,
  getActivitLog,
  getAllActivitLogs,
  updateActivitLog,
} from "../controller/activity.controller.js";

import express from "express";
const router = express.Router();

// ActivitLogs routes
router.get("/", getAllActivitLogs);
router.post("/", createActivitLog);
router.get("/:id", getActivitLog);
router.patch("/:id", updateActivitLog);
router.delete("/:id", deleteActivitLog);

export default router;
