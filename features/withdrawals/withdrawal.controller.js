import AppError from "../../utils/appError.js";
import catchAsync from "../error/catch-async-error.js";
import { deleteOne, getOne, updateOne } from "../factory/factory-functions.js";

import Investment from "../investment/model/investment.model.js";
import WithdrawalModel from "./withdrawal.model.js";

// Create withdrawal handler
export const createWithdrawal = catchAsync(async (req, res, next) => {
  const { user, amount } = req.body; // Extract userId and withdrawal amount from the request body

  // Step 1: Fetch the user's investment details
  const investment = await Investment.findOne({ user });

  if (!investment) {
    return next(new AppError("Investment not found for this user.", 404)); // Handle case when investment is not found
  }

  // Step 2: Check if withdrawal amount is less than or equal to the investment principal
  if (amount > investment.principal) {
    return next(new AppError("Insufficient funds for withdrawal.", 400)); // Handle insufficient funds
  }

  // Step 3: Deduct the withdrawal amount from the principal
  const newPrincipal = investment.principal - amount;

  // Step 4: Update the user's investment principal
  investment.principal = newPrincipal;
  await investment.save();

  // Step 5: Create the withdrawal record
  const doc = await WithdrawalModel.create(req.body);

  // Step 6: Return success response
  res.status(201).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

export const getUserWithdrawals = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not found. Please log in.", 401)); // Return an error if req.user is not found
  }
  const doc = await WithdrawalModel.find({ user: req.user._id });
  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

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
