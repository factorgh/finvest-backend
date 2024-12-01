import catchAsync from "../error/catch-async-error.js";
import {
  createOne,
  deleteOne,
  getOne,
  updateOne,
} from "../factory/factory-functions.js";

import WithdrawalModel from "./withdrawal.model.js";

export const createWithdrawal = createOne(WithdrawalModel);
export const deleteWithdrawal = deleteOne(WithdrawalModel);
export const updateWithdrawal = updateOne(WithdrawalModel);
// export const getAllWithdrawals = getAll(WithdrawalModel);
export const getAllWithdrawals = catchAsync(async (req, res, next) => {
  const rentals = await WithdrawalModel.find().populate("user");
  res.status(200).json({
    status: "success",
    data: {
      data: rentals,
    },
  });
});
export const getWithdrawal = getOne(WithdrawalModel);
