import { generateTransactionId } from "../../../utils/halper.js";
import {
  getQuarter,
  getQuarterEndDate,
} from "../../../utils/handle_date_range.js";
import { calculateDynamicAccruedReturn } from "../../../utils/handle_dynamic_rate.js";
import User from "../../auth/models/user.model.js";
import catchAsync from "../../error/catch-async-error.js";
import Investment from "../model/investment.model.js";

export const createInvestment = catchAsync(async (req, res, next) => {
  const {
    userId,
    principal,
    guaranteedRate = 8,
    managementFeeRate,
    operationalCost,
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

  // Daily accrued Return
  const dailyRate = guaranteedRate / 100;
  const CalculatedDailyAmount = dailyRate * principal;

  // End of daily amount
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
    managementFee: managementFeeTotal,
    totalAccruedReturn: transformedTotalAccruedReturn,
    creationDate,
    quarterEndDate,
    expectedReturnHolder: CalculatedDailyAmount,
    operationalCost,
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

export const updateInvestment = catchAsync(async (req, res, next) => {
  const investmentId = req.params.id;
  const updateData = req.body;

  // Update the investment and return the updated document
  const investment = await Investment.findByIdAndUpdate(
    investmentId,
    updateData,
    {
      new: true, // Return the updated document
      runValidators: true, // Ensure validation rules are applied
    }
  );

  if (!investment) {
    return res.status(404).json({
      status: "fail",
      message: "Investment not found",
    });
  }

  res.status(200).json({
    status: "success",
    message: "Investment updated successfully",
    data: { investment },
  });
});

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

  const updatedQuarter = currentQuarter.split("-")[1];
  console.log(`Updated quarter extracted: ${updatedQuarter}`);

  const nextQuarter = getQuarter(
    new Date(new Date().setMonth(new Date().getMonth() + 3))
  );

  try {
    // Find archived transactions for the current quarter
    const archivedTransactions = await Investment.find({
      quarter: updatedQuarter,
      archived: true,
    });
    console.log(
      `Archived transactions found for current quarter: ${currentQuarter}`
    );

    console.log(
      `Rollover started for current quarter: ${currentQuarter} and next quarter: ${nextQuarter}`
    );

    console.log("Archived transactions:", archivedTransactions);

    for (const transaction of archivedTransactions) {
      console.log(
        `Processing archived transaction for user ${transaction.userId} with ID ${transaction._id}`
      );

      // Calculate new principal
      const updatedPrincipal =
        transaction.principal + transaction.totalAccruedReturn;

      // Create a new transaction for the next quarter
      const newTransaction = await Investment.create({
        userId: transaction.userId,
        name: transaction.name, // Preserve name
        principal: updatedPrincipal,
        accruedReturn: 0, // Reset accrued return
        quarter: nextQuarter.split("-")[1],
        transactionId: generateTransactionId(),
        startDate: new Date(), // Corrected startDate
        quarterEndDate: new Date(
          new Date(transaction.quarterEndDate).setMonth(
            new Date(transaction.quarterEndDate).getMonth() + 3
          )
        ),
        archived: false,
        active: true,
        mandate: transaction.mandate,
        partnerForm: transaction.partnerForm,
        certificate: transaction.certificate,
        checklist: transaction.checklist,
        addOns: [],
        oneOffs: [],
        previousTransactionId: transaction._id, // Link to the archived transaction
      });

      console.log(
        `New transaction created for user ${transaction.userId} for ${nextQuarter} with ID ${newTransaction._id}`
      );
    }

    console.log("Rollover complete for current quarter:", currentQuarter);
  } catch (error) {
    console.error("Error during rollover process:", error.message || error);
    throw new Error("Rollover process failed");
  }
};

// Archiving of investors
export const archiveTransactions = async () => {
  const currentQuarter = getQuarter();
  console.log(
    `---------------------------------CURRENT QUARTER: ${currentQuarter}`
  );

  const updatedQuarter = currentQuarter.split("-")[1];
  console.log(`Updated quarter extracted: ${updatedQuarter}`);

  try {
    // Ensure there are no mismatches in quarter formatting or archived field state
    const query = { quarter: updatedQuarter, archived: false };
    console.log(`Query:`, query);

    const result = await Investment.updateMany(query, {
      $set: { archived: true, active: false },
    });

    console.log(
      `---------------------------------ARCHIVED TRANSACTIONS --------------------------------`
    );
    console.log(`Matched ${result.matchedCount} transactions`);
    console.log(`Modified ${result.modifiedCount} transactions`);

    if (result.matchedCount === 0) {
      console.warn(
        `No transactions matched for quarter ${updatedQuarter}. Check your data.`
      );
    } else if (result.modifiedCount === 0) {
      console.warn(
        `Transactions were matched but not updated. This could indicate no active transactions for the quarter.`
      );
    } else {
      console.log(
        `Successfully archived ${result.modifiedCount} transactions for quarter ${currentQuarter}`
      );
    }
  } catch (error) {
    console.error("Error archiving transactions:", error);
    throw new Error("Failed to archive transactions");
  }
};

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
