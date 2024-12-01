import catchAsync from "../error/catch-async-error.js";
import {
  createOne,
  deleteOne,
  getOne,
  updateOne,
} from "../factory/factory-functions.js";

import PaymentModel from "./payments.model.js";

export const createPayment = createOne(PaymentModel);
export const deletePayment = deleteOne(PaymentModel);
export const updatePayment = updateOne(PaymentModel);
//
export const getAllPayments = catchAsync(async (req, res, next) => {
  const payments = await PaymentModel.find().populate("user");
  res.status(200).json({
    status: "success",
    data: {
      data: payments,
    },
  });
});
export const getPayment = getOne(PaymentModel);
