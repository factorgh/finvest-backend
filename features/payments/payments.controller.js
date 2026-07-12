import AppError from "../../utils/appError.js";
import catchAsync from "../error/catch-async-error.js";
import { deleteOne, getOne, updateOne } from "../factory/factory-functions.js";
import Investment from "../investment/model/investment.model.js";

import PaymentModel from "./payments.model.js";

import ActivityLog from "../activity-log/activity.model.js";
import { recalculateInvestment } from "../../utils/recalculate.js";

// Create payment handler
export const createPayment = catchAsync(async (req, res, next) => {
  console.log(req.body);
  const { user, amount } = req.body; // Extract userId and payment amount from the request body

  // Step 1: Fetch the user's investment details
  const investment = await Investment.findOne({ userId: user });

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

  // Step 4: Reduce the investment principal by the payment amount
  investment.principal -= amount;

  // Step 5: Save the updated investment
  await investment.save();

  // Step 6: Trigger recalculation
  await recalculateInvestment(investment._id);

  // Step 7: Log activity
  try {
    await ActivityLog.create({
      user: req.user?._id || user,
      activity: "Payment Created",
      description: `A payment entry of GHS ${amount} was created for user ${user}.`,
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

export const deletePayment = catchAsync(async (req, res, next) => {
  const doc = await PaymentModel.findByIdAndDelete(req.params.id);

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
      activity: "Payment Deleted",
      description: `A payment entry of GHS ${doc.amount} was deleted for user ${doc.user}. Principal restored.`,
    });
  } catch (err) {
    console.error("Activity logging failed:", err);
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const updatePayment = catchAsync(async (req, res, next) => {
  const oldDoc = await PaymentModel.findById(req.params.id);
  if (!oldDoc) {
    return next(new AppError("No document found with that ID", 404));
  }

  const doc = await PaymentModel.findByIdAndUpdate(req.params.id, req.body, {
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
      activity: "Payment Updated",
      description: `A payment entry was updated for user ${doc.user}. New amount: GHS ${doc.amount}.`,
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
//
export const getAllPayments = catchAsync(async (req, res, next) => {
  const payments = await PaymentModel.find()
    .sort({ rrquestedDate: -1 })
    .populate("user");
  res.status(200).json({
    status: "success",
    data: {
      data: payments,
    },
  });
});
export const getUserPayments = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not found. Please log in.", 401));
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
