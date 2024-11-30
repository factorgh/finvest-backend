import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from "../factory/factory-functions.js";

import PaymentModel from "./payments.model.js";

export const createPayment = createOne(PaymentModel);
export const deletePayment = deleteOne(PaymentModel);
export const updatePayment = updateOne(PaymentModel);
export const getAllPayments = getAll(PaymentModel);
export const getPayment = getOne(PaymentModel);
