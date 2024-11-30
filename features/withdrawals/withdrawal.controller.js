import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from "../factory/factory-functions.js";

import WithdrawalModel from "./withdrawal.model.js";

export const createWithdrawal = createOne(WithdrawalModel);
export const deleteWithdrawal = deleteOne(WithdrawalModel);
export const updateWithdrawal = updateOne(WithdrawalModel);
export const getAllWithdrawals = getAll(WithdrawalModel);
export const getWithdrawal = getOne(WithdrawalModel);
