import catchAsync from "../error/catch-async-error.js";
import {
  createOne,
  deleteOne,
  getOne,
  updateOne,
} from "../factory/factory-functions.js";

import ActivityLog from "./activity.model.js";

export const createActivityLog = createOne(ActivityLog);
export const deleteActivityLog = deleteOne(ActivityLog);
export const updateActivityLog = updateOne(ActivityLog);
// export const getAllActivityLogs = getAll(ActivityLog);

export const getAllActivityLogs = catchAsync(async (req, res, next) => {
  const payments = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .populate("user");

  res.status(200).json({
    status: "success",
    data: {
      data: payments,
    },
  });
});
export const getActivityLog = getOne(ActivityLog);
