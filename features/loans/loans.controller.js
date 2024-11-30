import catchAsync from "../error/catch-async-error.js";
import {
  createOne,
  deleteOne,
  getOne,
  updateOne,
} from "../factory/factory-functions.js";

import LoanModel from "./loans.model.js";
const popOptions = {
  path: "user", // Assuming you want to populate the 'user' field in the loan model
  select: "name email", // Specify the fields you want to retrieve for the 'user' (name and email)
};

export const createLoan = createOne(LoanModel);
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
export const getLoan = getOne(LoanModel);
