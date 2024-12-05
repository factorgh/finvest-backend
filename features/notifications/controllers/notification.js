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
// Controller method for marking all notifications as read
export const readAllNotifications = catchAsync(async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check if user ID is passed
    if (!userId) {
      return res.status(400).json({
        status: "fail",
        message: "User ID is required",
      });
    }
    // Check if the user has unread messages
    const count = await Notification.countDocuments({
      users: userId, // Ensure that the user ID is correct
      read: false,
    });
    if (count === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No unread notifications found",
      });
    }

    // Update all unread notifications for the user
    const result = await Notification.updateMany(
      {
        users: userId, // Ensure that the user ID is correct
        read: false,
      },
      { $set: { read: true } }
    );

    // Check if any documents were updated
    if (result.nModified === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No unread notifications found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        message: "All notifications marked as read",
      },
    });
  } catch (err) {
    return next(err); // Let your global error handler deal with the error
  }
});

// Get notification by specific user
export const getNotificationByUser = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not found. Please log in.", 401)); // Return an error if req.user is not found
  }
  // Use $in to find notifications where the user's _id is in the 'users' array
  const notifications = await Notification.find({
    users: req.user._id,
  }).sort({ createdAt: -1 });

  if (!notifications || notifications.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "No notifications found for this user",
    });
  }

  res.status(200).json({
    status: "success",
    data: notifications,
  });
});
