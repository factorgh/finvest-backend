import express from "express";
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
router.get("/user/:userId", getNotificationByUser);
router.delete("/:id", deleteNotification);
router.post("/readAll", readAllNotifications);
router.post("/", createNotification);

export default router;
