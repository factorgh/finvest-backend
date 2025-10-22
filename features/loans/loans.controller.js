import catchAsync from "../error/catch-async-error.js";
import { deleteOne, getOne, updateOne } from "../factory/factory-functions.js";

import LoanModel from "./loans.model.js";
const popOptions = {
  path: "user", // Assuming you want to populate the 'user' field in the loan model
  select: "name email", // Specify the fields you want to retrieve for the 'user' (name and email)
};

// export const createLoan = createOne(LoanModel);
export const createLoan = catchAsync(async (req, res, next) => {
  console.log(req.body);
  let { loanAmount, loanRate, isExternal, overdueRate, dueDate, quater, status, ...otherFields } = req.body;

  // Apply defaults for external loans if some fields are not provided
  if (isExternal) {
    // Basic validation for external loans
    const { externalName, externalPhone, externalGhanaCard } = otherFields;
    if (!externalName || !externalPhone || !externalGhanaCard) {
      return res.status(400).json({
        status: "fail",
        message: "externalName, externalPhone, and externalGhanaCard are required for external loans",
      });
    }

    // Simple pattern checks (can be improved)
    const phoneOk = /^0\d{9}$/.test(externalPhone);
    const ghCardOk = /^[A-Za-z]{2,3}-?[0-9A-Za-z]{6,9}-?[0-9A-Za-z]$/.test(externalGhanaCard);
    if (!phoneOk) {
      return res.status(400).json({ status: "fail", message: "Invalid phone number format" });
    }
    if (!ghCardOk) {
      return res.status(400).json({ status: "fail", message: "Invalid Ghana card number format" });
    }

    if (!loanRate) loanRate = 10; // default 10%
    if (!overdueRate) overdueRate = 5; // default 5%
    if (!quater) quater = "Q1";
    if (!status) status = "Active";
    if (!dueDate) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      dueDate = d;
    }
  }

  const loanFee = (loanAmount * loanRate) / 100;
  const amountDue = loanAmount + loanFee;

  const doc = new LoanModel({
    ...otherFields,
    isExternal: Boolean(isExternal),
    loanAmount,
    loanRate,
    overdueRate,
    quater,
    status,
    dueDate,
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
  const { isExternal } = req.query;
  const filter = {};
  if (typeof isExternal !== "undefined") {
    filter.isExternal = isExternal === "true";
  }
  const loans = await LoanModel.find(filter).populate(popOptions);
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
