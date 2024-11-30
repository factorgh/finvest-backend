import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from "../factory/factory-functions.js";

import ActivityLog from "./activity.model.js";

export const createActivityLog = createOne(ActivityLog);
export const deleteActivityLog = deleteOne(ActivityLog);
export const updateActivityLog = updateOne(ActivityLog);
export const getAllActivityLogs = getAll(ActivityLog);
export const getActivityLog = getOne(ActivityLog);
