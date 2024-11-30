import catchAsync from "../../error/catch-async-error.js";
import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from "../../factory/factory-functions.js";

import Notification from "../models/notification.js";

export const createNotification = createOne(Notification);
export const deleteNotification = deleteOne(Notification);
export const updateNotification = updateOne(Notification);
export const getAllNotifications = getAll(Notification);
export const getNotification = getOne(Notification);

// Read all notifications
export const readAllNotifications = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    {
      user: req.user._id,
      read: false,
    },
    { $set: { read: true } }
  );
  res.status(200).json({
    status: "success",
    data: {
      data: "All notifications read",
    },
  });
});

// Get notification by specific user
export const getNotificationByUser = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOne({
    user: req.user._id,
    _id: req.params.id,
  });

  if (!notification) {
    return res.status(404).json({
      status: "fail",
      message: "Notification not found",
    });
  }

  res.status(200).json({
    status: "success",
    data: notification,
  });
});
