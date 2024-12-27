import { generateTransactionId } from "../../../utils/halper.js";
import {
  getQuarter,
  getQuarterEndDate,
} from "../../../utils/handle_date_range.js";
import { calculateDynamicAccruedReturn } from "../../../utils/handle_dynamic_rate.js";
import User from "../../auth/models/user.model.js";
import catchAsync from "../../error/catch-async-error.js";
import { updateOne } from "../../factory/factory-functions.js";
import Investment from "../model/investment.model.js";

export const createInvestment = catchAsync(async (req, res, next) => {
  const {
    userId,
    principal,
    guaranteedRate = 8,
    managementFeeRate,

    performanceYield,
    others,
    mandate,
    partnerForm,
    certificate,
    checklist,
  } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ status: "fail", message: "User not found" });
  }

  const creationDate = new Date();
  const quarterEndDate = getQuarterEndDate(creationDate);

  const principalAccruedReturn =
    (await calculateDynamicAccruedReturn(
      principal,
      creationDate,
      quarterEndDate,
      guaranteedRate
    )) || 0;

  const totalAccrued = principalAccruedReturn + performanceYield;
  const transformedTotalAccrued = Number(totalAccrued) || 0;

  let managementFeeTotal = 0;
  if (transformedTotalAccrued > 0) {
    managementFeeTotal = (transformedTotalAccrued * managementFeeRate) / 100;
  }

  const totalAccruedReturn = transformedTotalAccrued - managementFeeTotal;
  const transformedTotalAccruedReturn = Math.max(
    Number(totalAccruedReturn) || 0,
    0
  );

  const investmentDetails = {
    ...req.body,
    principalAccruedReturn,

    totalAccruedReturn: transformedTotalAccruedReturn,
    creationDate,
    quarterEndDate,
    others,
    mandate,
    partnerForm,
    certificate,
    checklist,
    transactionId: generateTransactionId(),
    name: "Abdul",
  };

  const newInvestment = await Investment.create(investmentDetails);

  res.status(201).json({
    status: "success",
    data: { investment: newInvestment },
  });
});

// Get all user investements
export const getAllInvestments = catchAsync(async (req, res, next) => {
  // Find user and populate investments
  const investments = await Investment.find().populate([
    "addOns",
    "oneOffs",
    "userId",
  ]);
  if (!investments) {
    return res.status(404).json({ status: "fail", message: "No investments" });
  }

  res.status(200).json({
    status: "success",
    data: investments,
  });
});

// Update investment
export const updateInvestment = updateOne(Investment);

// Get a single transaction for a partcular user
export const getInvestment = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  console.log("some user", userId);
  // Ensure the investment belongs to the user
  const investment = await Investment.find({
    userId: userId,
  }).populate(["addOns", "oneOffs"]);

  if (!investment) {
    return res.status(404).json({
      status: "fail",
      message: "Investment not found or access denied",
    });
  }

  res.status(200).json({
    status: "success",
    data: investment,
  });
});

// Investment Rollovers
export const rolloverInvestments = async () => {
  const currentQuarter = getQuarter();
  const nextQuarter = getQuarter(
    new Date(new Date().setMonth(new Date().getMonth() + 3))
  );

  // Find archived transactions for the current quarter
  const archivedTransactions = await Investment.find({
    quarter: currentQuarter,
    archived: true,
  });

  for (const transaction of archivedTransactions) {
    const updatedPrincipal = transaction.principal + transaction.accruedReturn;

    // Create a new transaction for the next quarter
    const newTransaction = await Investment.create({
      userId: transaction.userId,
      name: transaction.name, // Preserve name
      principal: updatedPrincipal,
      accruedReturn: 0, // Reset accrued return
      quarter: nextQuarter.split("-")[1],
      quarterEndDate: new Date(
        new Date(transaction.quarterEndDate).setMonth(
          new Date(transaction.quarterEndDate).getMonth() + 3
        )
      ),
      archived: false,
      active: true,
      previousTransactionId: transaction._id, // Link to the archived transaction
    });

    console.log(
      `New transaction created for user ${transaction.userId} for ${nextQuarter} with ID ${newTransaction._id}`
    );
  }

  console.log("Rollover complete for current quarter:", currentQuarter);
};

// Archiving of investors
export const archiveTransactions = async () => {
  const currentQuarter = getQuarter();

  try {
    // Bulk update: Mark all transactions for the current quarter as archived
    const result = await Investment.updateMany(
      { quarter: currentQuarter, archived: false },
      { $set: { archived: true, active: false } } // Set both archived and inactive
    );

    console.log(
      `Archived ${result.nModified} transactions for quarter ${currentQuarter}`
    );

    // Optionally, move to ArchivedTransaction model
    /*
    const transactionsToArchive = await Investment.find({ quarter: currentQuarter, archived: true });
    for (const transaction of transactionsToArchive) {
      await ArchivedTransaction.create({ ...transaction.toObject() });
    }
    */
  } catch (error) {
    console.error("Error archiving transactions:", error);
    throw new Error("Failed to archive transactions");
  }
};

// const archiveTransactions = async (currentQuarter) => {
//   console.log(`Archiving transactions for quarter: ${currentQuarter}`);

//   // Update transactions to mark them as archived
//   const result = await Investment.updateMany(
//     { quarter: currentQuarter, archived: false, active: true },
//     { $set: { archived: true, active: false } }
//   );

//   console.log(
//     `Archived ${result.nModified} transactions for quarter ${currentQuarter}`
//   );
// };
export const deleteInvestment = catchAsync(async (req, res, nex) => {
  const { id } = req.params;
  const investment = await Investment.findByIdAndDelete(id);
  if (!investment) {
    return res
      .status(404)
      .json({ status: "fail", message: "Investment not found" });
  }
  res.status(204).json({ status: "success", data: null });
});
