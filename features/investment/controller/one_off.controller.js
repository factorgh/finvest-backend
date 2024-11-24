import catchAsync from "../../error/catch-async-error.js";
import Investment from "../model/investment.model.js";
import { OneOff } from "../model/one_off.model.js";

export const addOneOffsToInvestment = catchAsync(async (req, res, next) => {
  const { investmentId } = req.params;
  const { amount, rate, dateOfEntry } = req.body;

  const investment = await Investment.findById(investmentId);
  if (!investment) {
    return res
      .status(404)
      .json({ status: "fail", message: "Investment not found" });
  }

  const newOneOff = { amount, rate, dateOfEntry: Date.now() };
  const createdOeneOff = await OneOff.create(newOneOff);
  investment.oneOffs.push(createdOeneOff._id);
  investment.lastModified = new Date();

  await investment.save();

  res.status(200).json({ status: "success", data: investment });
});

// Get all addons and their details
export const getOneffs = catchAsync(async (req, res, next) => {
  const { userId, investmentId } = req.params;

  // Ensure the investment belongs to the user
  const investment = await Investment.findOne({
    _id: investmentId,
    user: userId,
  });

  if (!investment) {
    return res
      .status(404)
      .json({ status: "fail", message: "Investment not found" });
  }

  res.status(200).json({ status: "success", data: investment.oneOffs });
});
