import {
  createActivityLog,
  deleteActivityLog,
  getActivityLog,
  getAllActivityLogs,
  updateActivityLog,
} from "../activity-log/activity_controller.js";

import express from "express";
const router = express.Router();

// ActivitLogs routes
router.get("/", getAllActivityLogs);
router.post("/", createActivityLog);
router.get("/:id", getActivityLog);
router.patch("/:id", updateActivityLog);
router.delete("/:id", deleteActivityLog);

export default router;
