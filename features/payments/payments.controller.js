import AppError from "../../utils/appError.js";
import catchAsync from "../error/catch-async-error.js";
import { deleteOne, getOne, updateOne } from "../factory/factory-functions.js";
import Investment from "../investment/model/investment.model.js";

import PaymentModel from "./payments.model.js";

// export const createPayment = createOne(PaymentModel);

// Create payment handler
export const createPayment = catchAsync(async (req, res, next) => {
  const { user, amount } = req.body; // Extract userId and payment amount from the request body

  // Step 1: Fetch the user's investment details
  const investment = await Investment.findOne({ user });

  if (!investment) {
    return next(new AppError("Investment not found for this user.", 404)); // Handle case when investment is not found
  }

  // Step 2: Check if payment amount is greater than or equal to the investment principal
  if (amount >= investment.principal) {
    return next(
      new AppError(
        "Payment amount cannot be greater than or equal to the principal.",
        400
      )
    ); // Handle invalid payment amount
  }

  // Step 3: Create the payment record
  const doc = await PaymentModel.create(req.body);

  // Step 4: Return success response
  res.status(201).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});
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
export const getUserPayments = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not found. Please log in.", 401)); // Return an error if req.user is not found
  }
  const doc = await PaymentModel.find({ user: req.user._id });
  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

export const getPayment = getOne(PaymentModel);
