import AppError from "../../utils/appError.js";
import catchAsync from "../error/catch-async-error.js";
import { deleteOne, getOne, updateOne } from "../factory/factory-functions.js";

import Investment from "../investment/model/investment.model.js";
import WithdrawalModel from "./withdrawal.model.js";

import ActivityLog from "../activity-log/activity.model.js";
import { recalculateInvestment } from "../../utils/recalculate.js";

// Create withdrawal handler
export const createWithdrawal = catchAsync(async (req, res, next) => {
  const { user, amount } = req.body; // Extract userId and withdrawal amount from the request body

  // Step 1: Fetch the user's investment details
  const investment = await Investment.findOne({ userId: user });

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

  // Step 6: Trigger recalculation
  await recalculateInvestment(investment._id);

  // Step 7: Log activity
  try {
    await ActivityLog.create({
      user: req.user?._id || user,
      activity: "Withdrawal Created",
      description: `A withdrawal entry of GHS ${amount} was created for user ${user}.`,
    });
  } catch (err) {
    console.error("Activity logging failed:", err);
  }

  // Step 8: Return success response
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

export const deleteWithdrawal = catchAsync(async (req, res, next) => {
  const doc = await WithdrawalModel.findByIdAndDelete(req.params.id);

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  // Adjust principal and recalculate
  const investment = await Investment.findOne({ userId: doc.user });
  if (investment) {
    investment.principal += doc.amount;
    await investment.save();
    await recalculateInvestment(investment._id);
  }

  // Log activity
  try {
    await ActivityLog.create({
      user: req.user?._id || doc.user,
      activity: "Withdrawal Deleted",
      description: `A withdrawal entry of GHS ${doc.amount} was deleted for user ${doc.user}. Principal restored.`,
    });
  } catch (err) {
    console.error("Activity logging failed:", err);
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const updateWithdrawal = catchAsync(async (req, res, next) => {
  const oldDoc = await WithdrawalModel.findById(req.params.id);
  if (!oldDoc) {
    return next(new AppError("No document found with that ID", 404));
  }

  const doc = await WithdrawalModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Adjust principal if amount changed
  if (req.body.amount !== undefined && req.body.amount !== oldDoc.amount) {
    const diff = req.body.amount - oldDoc.amount;
    const investment = await Investment.findOne({ userId: doc.user });
    if (investment) {
      investment.principal -= diff;
      await investment.save();
      await recalculateInvestment(investment._id);
    }
  }

  // Log activity
  try {
    await ActivityLog.create({
      user: req.user?._id || doc.user,
      activity: "Withdrawal Updated",
      description: `A withdrawal entry was updated for user ${doc.user}. New amount: GHS ${doc.amount}.`,
    });
  } catch (err) {
    console.error("Activity logging failed:", err);
  }

  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});
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
