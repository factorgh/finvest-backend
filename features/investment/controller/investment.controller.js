import { generateTransactionId } from "../../../utils/halper.js";
import {
  getQuarter,
  getQuarterEndDate,
} from "../../../utils/handle_date_range.js";
import { calculateDynamicAccruedReturn } from "../../../utils/handle_dynamic_rate.js";
import User from "../../auth/models/user.model.js";
import catchAsync from "../../error/catch-async-error.js";
import Investment from "../model/investment.model.js";
import { recalculateInvestment } from "../../../utils/recalculate.js";

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
    owners,
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
      guaranteedRate,
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
    0,
  );

  // Build owners: always include primary user, exclude primary from co-owners, and dedupe
  const inputOwners = Array.isArray(owners) ? owners : [];
  const normalizedCoOwners = inputOwners
    .map((o) => ({ user: o.user || o, role: o.role || "co-owner" }))
    .filter((o) => String(o.user) !== String(userId));
  // Dedupe by user
  const seen = new Set();
  const uniqueCoOwners = normalizedCoOwners.filter((o) => {
    const key = String(o.user);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const resolvedOwners = [{ user: userId, role: "primary" }, ...uniqueCoOwners];

  const investmentDetails = {
    ...req.body,
    owners: resolvedOwners,
    isJoint: resolvedOwners.length > 1,
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
    name: req.body.name || "",
  };

  const newInvestment = await Investment.create(investmentDetails);
  await recalculateInvestment(newInvestment._id);

  res.status(201).json({
    status: "success",
    data: { investment: newInvestment },
  });
});

// Get all user investements
export const getAllInvestments = catchAsync(async (req, res, next) => {
  // Find user and populate investments, including hidden archive/active fields
  const investments = await Investment.find()
    .select("+archived +active")
    .populate(["addOns", "oneOffs", "userId", { path: "owners.user" }]);
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

  // Permission: allow if requester is owner or admin/superadmin
  const existing = await Investment.findById(investmentId).populate({
    path: "owners.user",
  });
  if (!existing) {
    return res.status(404).json({
      status: "fail",
      message: "Investment not found",
    });
  }
  if (!req.user) {
    return res
      .status(401)
      .json({ status: "fail", message: "Not authenticated" });
  }
  const isAdmin =
    req.user && (req.user.role === "admin" || req.user.role === "superadmin");
  const requesterId = req.user._id;
  const isOwner = existing.owners?.some(
    (o) => String(o.user?._id || o.user) === String(requesterId),
  );
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ status: "fail", message: "Not authorized" });
  }

  // Update the investment and return the updated document
  const investment = await Investment.findByIdAndUpdate(
    investmentId,
    updateData,
    {
      new: true,
      runValidators: true,
    },
  ).populate([{ path: "owners.user" }, "addOns", "oneOffs", "userId"]);

  if (investment) {
    await recalculateInvestment(investment._id);
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
  // Ensure the investment belongs to the user and include archived/active flags
  const investment = await Investment.find({
    "owners.user": userId,
  })
    .select("+archived +active")
    .populate(["addOns", "oneOffs", { path: "owners.user" }]);

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
  const currentDate = new Date();
  const currentQuarterName = getQuarter(currentDate); // e.g., "2026-Q3"
  const targetQuarterLabel = currentQuarterName.split("-")[1]; // e.g., "Q3"

  const prevDate = new Date(currentDate);
  prevDate.setMonth(prevDate.getMonth() - 3);
  const sourceQuarterName = getQuarter(prevDate); // e.g., "2026-Q2"
  const sourceQuarterLabel = sourceQuarterName.split("-")[1]; // e.g., "Q2"

  try {
    // Find archived transactions for the source/previous quarter
    const archivedTransactions = await Investment.find({
      quarter: sourceQuarterLabel,
      archived: true,
    });
    console.log(
      `Archived transactions found for source quarter ${sourceQuarterLabel}: ${archivedTransactions.length}`,
    );

    console.log(
      `Rollover started from source quarter: ${sourceQuarterLabel} to target quarter: ${targetQuarterLabel}`,
    );

    for (const transaction of archivedTransactions) {
      console.log(
        `Processing archived transaction for user ${transaction.userId} with ID ${transaction._id}`,
      );

      // Prevent duplicate rollovers of the same transaction
      const existingRollover = await Investment.findOne({
        previousTransactionId: transaction._id,
      });
      if (existingRollover) {
        console.log(
          `Transaction for user ${transaction.userId} (ID: ${transaction._id}) has already been rolled over to ${existingRollover._id}`
        );
        continue;
      }

      // Calculate new principal
      const updatedPrincipal =
        transaction.principal + transaction.totalAccruedReturn;

      // Create a new transaction for the target/current quarter
      const newTransaction = await Investment.create({
        userId: transaction.userId,
        name: transaction.name, // Preserve name
        principal: updatedPrincipal,
        accruedReturn: 0, // Reset accrued return
        quarter: targetQuarterLabel,
        transactionId: generateTransactionId(),
        startDate: new Date(), // Corrected startDate
        quarterEndDate: new Date(
          new Date(transaction.quarterEndDate).setMonth(
            new Date(transaction.quarterEndDate).getMonth() + 3,
          ),
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
        owners: transaction.owners,
        isJoint: transaction.isJoint,
        guaranteedRate: transaction.guaranteedRate,
        managementFeeRate: transaction.managementFeeRate,
        operationalCost: transaction.operationalCost,
        performanceYield: transaction.performanceYield,
      });

      // Recalculate immediately for the new quarter investment
      await recalculateInvestment(newTransaction._id);

      console.log(
        `New transaction created for user ${transaction.userId} for ${targetQuarterLabel} with ID ${newTransaction._id}`,
      );
    }

    console.log("Rollover complete for target quarter:", currentQuarterName);
  } catch (error) {
    console.error("Error during rollover process:", error.message || error);
    throw new Error("Rollover process failed");
  }
};

// Archiving of investors
export const archiveTransactions = async () => {
  const currentDate = new Date();
  const prevDate = new Date(currentDate);
  prevDate.setMonth(prevDate.getMonth() - 3);
  const sourceQuarterName = getQuarter(prevDate); // e.g., "2026-Q2"
  const sourceQuarterLabel = sourceQuarterName.split("-")[1]; // e.g., "Q2"

  console.log(
    `---------------------------------ARCHIVING QUARTER: ${sourceQuarterName}`,
  );

  try {
    // Query active, non-archived investments of the previous quarter
    const query = { quarter: sourceQuarterLabel, archived: false };
    console.log(`Query:`, query);

    const result = await Investment.updateMany(query, {
      $set: { archived: true, active: false },
    });

    console.log(
      `---------------------------------ARCHIVED TRANSACTIONS --------------------------------`,
    );
    console.log(`Matched ${result.matchedCount} transactions`);
    console.log(`Modified ${result.modifiedCount} transactions`);

    if (result.matchedCount === 0) {
      console.warn(
        `No transactions matched for quarter ${sourceQuarterLabel}. Check your data.`,
      );
    } else if (result.modifiedCount === 0) {
      console.warn(
        `Transactions were matched but not updated. This could indicate no active transactions for the quarter.`,
      );
    } else {
      console.log(
        `Successfully archived ${result.modifiedCount} transactions for quarter ${sourceQuarterName}`,
      );
    }
  } catch (error) {
    console.error("Error archiving transactions:", error);
    throw new Error("Failed to archive transactions");
  }
};

export const deleteInvestment = catchAsync(async (req, res, nex) => {
  const { id } = req.params;
  const existing = await Investment.findById(id).populate({
    path: "owners.user",
  });
  if (!existing) {
    return res
      .status(404)
      .json({ status: "fail", message: "Investment not found" });
  }
  if (!req.user) {
    return res
      .status(401)
      .json({ status: "fail", message: "Not authenticated" });
  }
  const isAdmin =
    req.user && (req.user.role === "admin" || req.user.role === "superadmin");
  const requesterId = req.user._id;
  const isOwner = existing.owners?.some(
    (o) => String(o.user?._id || o.user) === String(requesterId),
  );
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ status: "fail", message: "Not authorized" });
  }
  const investment = await Investment.findByIdAndDelete(id);
  if (!investment) {
    return res
      .status(404)
      .json({ status: "fail", message: "Investment not found" });
  }
  res.status(204).json({ status: "success", data: null });
});
