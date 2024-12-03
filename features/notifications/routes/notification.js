import express from "express";
import { verifyToken } from "../../auth/middleware/verification.js";
import {
  createNotification,
  deleteNotification,
  getAllNotifications,
  getNotificationByUser,
  readAllNotifications,
} from "../controllers/notification.js";

const router = express.Router();

// Define your routes here

router.get("/", getAllNotifications);
router.get("/user", verifyToken, getNotificationByUser);
router.delete("/:id", deleteNotification);
router.put("/readAll/:id", readAllNotifications);

router.post("/", createNotification);

export default router;
