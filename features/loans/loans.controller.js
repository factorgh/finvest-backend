import catchAsync from "../error/catch-async-error.js";
import { deleteOne, getOne, updateOne } from "../factory/factory-functions.js";

import LoanModel from "./loans.model.js";
const popOptions = {
  path: "user", // Assuming you want to populate the 'user' field in the loan model
  select: "name email", // Specify the fields you want to retrieve for the 'user' (name and email)
};

// export const createLoan = createOne(LoanModel);
export const createLoan = catchAsync(async (req, res, next) => {
  const { LoanAmount, loanRate, ...otherFields } = req.body;
  const loanFee = (LoanAmount * loanRate) / 100;
  const amountDue = LoanAmount + loanFee;

  const doc = new LoanModel({
    ...otherFields,
    amountDue,
  });

  await doc.save();
  res.status(201).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

export const deleteLoan = deleteOne(LoanModel);
export const updateLoan = updateOne(LoanModel);
// export const getAllLoans = getAll(LoanModel, popOptions);
export const getAllLoans = catchAsync(async (req, res, next) => {
  const loans = await LoanModel.find().populate(popOptions);
  res.status(200).json({
    status: "success",
    data: {
      data: loans,
    },
  });
});
export const getUserLoans = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not found. Please log in.", 401)); // Return an error if req.user is not found
  }
  const doc = await LoanModel.find({ user: req.user._id });
  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

export const getLoan = getOne(LoanModel);
