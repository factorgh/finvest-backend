import moment from "moment";
import { generateTransactionId, calculateDailyRate } from "../../../utils/halper.js";
import {
  getQuarter,
  getQuarterEndDate,
  getQuarterDetails,
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

// Manual Rollover Controllers

export const getRolloverCandidates = catchAsync(async (req, res, next) => {
  const { sourceQuarter, targetQuarter } = req.query;
  const currentDate = new Date();
  const currentQuarterName = getQuarter(currentDate); // e.g. "2026-Q3"
  const defaultTargetQuarter = currentQuarterName.split("-")[1] || "Q3";

  const prevDate = new Date(currentDate);
  prevDate.setMonth(prevDate.getMonth() - 3);
  const prevQuarterName = getQuarter(prevDate);
  const defaultSourceQuarter = prevQuarterName.split("-")[1] || "Q2";

  const activeSourceQuarter = sourceQuarter || defaultSourceQuarter;
  const activeTargetQuarter = targetQuarter || defaultTargetQuarter;

  const query = sourceQuarter
    ? { quarter: sourceQuarter }
    : {
        $or: [
          { quarter: activeSourceQuarter },
          { active: true, archived: false },
        ],
      };

  const investments = await Investment.find(query)
    .select("+archived +active")
    .populate([
      { path: "userId", select: "name displayName email license photo" },
      { path: "owners.user", select: "name displayName email license photo" },
      "addOns",
      "oneOffs",
    ])
    .sort({ createdAt: -1 });

  const candidates = [];
  let totalEndingPrincipal = 0;
  let totalAccruedReturn = 0;
  let totalProjectedRollover = 0;
  let alreadyRolledOverCount = 0;

  for (const inv of investments) {
    const existingRollover = await Investment.findOne({
      previousTransactionId: inv._id,
      quarter: activeTargetQuarter,
    }).select("transactionId principal quarter createdAt");

    const isRolledOver = !!existingRollover;
    if (isRolledOver) {
      alreadyRolledOverCount++;
    }

    const endingPrincipal = Number(inv.principal || 0);
    const accruedReturn = Number(
      inv.totalAccruedReturn ?? inv.principalAccruedReturn ?? 0
    );
    const netClosingBalance = endingPrincipal + accruedReturn;
    const suggestedNewPrincipal = netClosingBalance;

    totalEndingPrincipal += endingPrincipal;
    totalAccruedReturn += accruedReturn;
    totalProjectedRollover += suggestedNewPrincipal;

    candidates.push({
      investmentId: inv._id,
      transactionId: inv.transactionId,
      name: inv.name,
      user: inv.userId,
      owners: inv.owners,
      isJoint: inv.isJoint,
      sourceQuarter: inv.quarter,
      targetQuarter: activeTargetQuarter,
      startDate: inv.startDate,
      quarterEndDate: inv.quarterEndDate,
      endingPrincipal,
      accruedReturn,
      netClosingBalance,
      suggestedNewPrincipal,
      guaranteedRate: inv.guaranteedRate ?? 8,
      managementFeeRate: inv.managementFeeRate ?? 20,
      operationalCost: inv.operationalCost ?? 0,
      performanceYield: inv.performanceYield ?? 0,
      archived: inv.archived,
      active: inv.active,
      isRolledOver,
      existingRolloverId: existingRollover?._id || null,
      existingRolloverTransactionId: existingRollover?.transactionId || null,
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      sourceQuarter: activeSourceQuarter,
      targetQuarter: activeTargetQuarter,
      summary: {
        totalCandidates: candidates.length,
        alreadyRolledOverCount,
        pendingCount: candidates.length - alreadyRolledOverCount,
        totalEndingPrincipal,
        totalAccruedReturn,
        totalProjectedRollover,
      },
      candidates,
    },
  });
});

export const executeSingleRollover = catchAsync(async (req, res, next) => {
  const {
    investmentId,
    targetQuarter,
    newPrincipal,
    guaranteedRate = 8,
    managementFeeRate = 20,
    operationalCost = 0,
    performanceYield = 0,
    startDate,
    quarterEndDate,
    notes,
  } = req.body;

  if (!investmentId) {
    return res.status(400).json({ status: "fail", message: "Investment ID is required" });
  }

  const sourceInv = await Investment.findById(investmentId).populate("userId");
  if (!sourceInv) {
    return res.status(404).json({ status: "fail", message: "Source mandate not found" });
  }

  const effectiveTargetQuarter = targetQuarter || getQuarter(new Date()).split("-")[1];

  const existingRollover = await Investment.findOne({
    previousTransactionId: sourceInv._id,
    quarter: effectiveTargetQuarter,
  });

  if (existingRollover) {
    return res.status(400).json({
      status: "fail",
      message: `Mandate has already been rolled over to ${effectiveTargetQuarter} (Transaction ID: ${existingRollover.transactionId})`,
    });
  }

  sourceInv.archived = true;
  sourceInv.active = false;
  await sourceInv.save({ validateBeforeSave: false });

  const newStartDate = startDate ? new Date(startDate) : new Date();
  const defaultQuarterEnd = getQuarterEndDate(newStartDate);
  const newEndDate = quarterEndDate ? new Date(quarterEndDate) : defaultQuarterEnd;

  const principalToSet =
    newPrincipal !== undefined && newPrincipal !== null && !isNaN(Number(newPrincipal))
      ? Number(newPrincipal)
      : Number(sourceInv.principal) + Number(sourceInv.totalAccruedReturn || 0);

  const newTransaction = await Investment.create({
    userId: sourceInv.userId?._id || sourceInv.userId,
    name: sourceInv.name,
    principal: Math.max(0, principalToSet),
    accruedReturn: 0,
    quarter: effectiveTargetQuarter,
    transactionId: generateTransactionId(),
    startDate: newStartDate,
    quarterEndDate: newEndDate,
    archived: false,
    active: true,
    mandate: sourceInv.mandate || [],
    partnerForm: sourceInv.partnerForm || [],
    certificate: sourceInv.certificate || [],
    checklist: sourceInv.checklist || [],
    others: sourceInv.others || [],
    addOns: [],
    oneOffs: [],
    previousTransactionId: sourceInv._id,
    owners: sourceInv.owners || [],
    isJoint: sourceInv.isJoint || false,
    guaranteedRate: Number(guaranteedRate),
    managementFeeRate: Number(managementFeeRate),
    operationalCost: Number(operationalCost),
    performanceYield: Number(performanceYield),
    notes: notes || undefined,
  });

  await recalculateInvestment(newTransaction._id);

  const populatedNewTransaction = await Investment.findById(newTransaction._id).populate([
    { path: "userId", select: "name displayName email license" },
    { path: "owners.user", select: "name displayName email license" },
  ]);

  res.status(201).json({
    status: "success",
    message: "Mandate successfully rolled over with manual values",
    data: populatedNewTransaction,
  });
});

export const executeBatchRollover = catchAsync(async (req, res, next) => {
  const { rollovers, targetQuarter } = req.body;

  if (!Array.isArray(rollovers) || rollovers.length === 0) {
    return res.status(400).json({ status: "fail", message: "Please provide a non-empty rollovers array" });
  }

  const results = [];
  const errors = [];

  for (const item of rollovers) {
    try {
      const {
        investmentId,
        newPrincipal,
        guaranteedRate = 8,
        managementFeeRate = 20,
        operationalCost = 0,
        performanceYield = 0,
        startDate,
        quarterEndDate,
        notes,
      } = item;

      if (!investmentId) {
        errors.push({ investmentId, error: "Missing investment ID" });
        continue;
      }

      const sourceInv = await Investment.findById(investmentId);
      if (!sourceInv) {
        errors.push({ investmentId, error: "Source mandate not found" });
        continue;
      }

      const effectiveTargetQuarter =
        item.targetQuarter || targetQuarter || getQuarter(new Date()).split("-")[1];

      const existingRollover = await Investment.findOne({
        previousTransactionId: sourceInv._id,
        quarter: effectiveTargetQuarter,
      });

      if (existingRollover) {
        errors.push({
          investmentId,
          error: `Already rolled over to ${effectiveTargetQuarter}`,
        });
        continue;
      }

      sourceInv.archived = true;
      sourceInv.active = false;
      await sourceInv.save({ validateBeforeSave: false });

      const newStartDate = startDate ? new Date(startDate) : new Date();
      const defaultQuarterEnd = getQuarterEndDate(newStartDate);
      const newEndDate = quarterEndDate ? new Date(quarterEndDate) : defaultQuarterEnd;

      const principalToSet =
        newPrincipal !== undefined && newPrincipal !== null && !isNaN(Number(newPrincipal))
          ? Number(newPrincipal)
          : Number(sourceInv.principal) + Number(sourceInv.totalAccruedReturn || 0);

      const newTransaction = await Investment.create({
        userId: sourceInv.userId,
        name: sourceInv.name,
        principal: Math.max(0, principalToSet),
        accruedReturn: 0,
        quarter: effectiveTargetQuarter,
        transactionId: generateTransactionId(),
        startDate: newStartDate,
        quarterEndDate: newEndDate,
        archived: false,
        active: true,
        mandate: sourceInv.mandate || [],
        partnerForm: sourceInv.partnerForm || [],
        certificate: sourceInv.certificate || [],
        checklist: sourceInv.checklist || [],
        others: sourceInv.others || [],
        addOns: [],
        oneOffs: [],
        previousTransactionId: sourceInv._id,
        owners: sourceInv.owners || [],
        isJoint: sourceInv.isJoint || false,
        guaranteedRate: Number(guaranteedRate),
        managementFeeRate: Number(managementFeeRate),
        operationalCost: Number(operationalCost),
        performanceYield: Number(performanceYield),
        notes: notes || undefined,
      });

      await recalculateInvestment(newTransaction._id);
      results.push({
        sourceInvestmentId: investmentId,
        newInvestmentId: newTransaction._id,
        transactionId: newTransaction.transactionId,
        principal: newTransaction.principal,
        quarter: newTransaction.quarter,
      });
    } catch (err) {
      errors.push({
        investmentId: item.investmentId,
        error: err?.message || "Rollover failed",
      });
    }
  }

  res.status(200).json({
    status: "success",
    message: `Batch rollover processed: ${results.length} succeeded, ${errors.length} failed`,
    data: {
      succeeded: results,
      errors,
    },
  });
});

/**
 * Daily Accruals Calculation
 * Callable via:
 * 1. Dedicated Cron API: POST /api/v1/investments/accruals/calculate
 * 2. Authenticated Admin: verifyToken with admin or superadmin
 * 3. External Cron Scheduler: header 'x-cron-secret' or '?secret=' matching CRON_SECRET
 * 4. Internal Background Worker / node-cron
 */
export const calculateDailyAccruals = async (req, res, next) => {
  try {
    const CRON_SECRET = process.env.CRON_SECRET || "finvest_accruals_secret_key";

    // When called over HTTP, authenticate via admin JWT or cron secret
    if (req && res) {
      const authHeader = req.headers?.authorization;
      const bearerToken =
        authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : null;

      const providedSecret =
        req.headers?.["x-cron-secret"] ||
        req.query?.secret ||
        (req.body?.secret ? req.body.secret : null) ||
        bearerToken;

      const isAuthorizedUser =
        req.user && (req.user.role === "admin" || req.user.role === "superadmin");
      const isValidSecret = providedSecret && providedSecret === CRON_SECRET;

      if (!isAuthorizedUser && !isValidSecret) {
        return res.status(401).json({
          status: "fail",
          message:
            "Unauthorized: Please provide a valid 'x-cron-secret' header, '?secret=' parameter, or admin credentials.",
        });
      }
    }

    const currentDate = moment();
    const quarterDays = getQuarterDetails();

    // Query ONLY active, non-archived mandates
    const investments = await Investment.find({
      active: true,
      archived: false,
    }).populate(["addOns", "oneOffs"]);

    console.log(
      `[AccrualsEngine] Executing daily calculations for ${investments.length} active mandate(s)...`
    );

    let updatedCount = 0;
    let totalGrossAccrued = 0;
    let totalManagementFees = 0;
    let totalNetAccrued = 0;
    const details = [];

    for (const investment of investments) {
      // Determine effective calculation date (clamp to quarterEndDate if reached)
      let calcDate = currentDate;
      if (investment.quarterEndDate) {
        const qEnd = moment(investment.quarterEndDate);
        if (currentDate.isAfter(qEnd)) {
          calcDate = qEnd;
        }
      }

      const daysSinceStart = Math.max(0, calcDate.diff(moment(investment.startDate), "days"));
      if (daysSinceStart <= 0) continue;

      const mandateQuarterDays = getQuarterDetails(
        investment.startDate || investment.creationDate || calcDate.toDate()
      );

      // 1. Principal Daily Return
      const principalDailyReturn = calculateDailyRate(
        investment.principal,
        investment.guaranteedRate ?? 8,
        mandateQuarterDays
      );
      const principalReturn = principalDailyReturn * daysSinceStart;
      investment.principalAccruedReturn = principalReturn;

      // 2. Add-on Returns
      let totalAddOnReturn = 0;
      if (Array.isArray(investment.addOns)) {
        for (const addOn of investment.addOns) {
          if (addOn.status !== "active") continue;

          let addOnCalcDate = currentDate;
          if (investment.quarterEndDate) {
            const qEnd = moment(investment.quarterEndDate);
            if (currentDate.isAfter(qEnd)) addOnCalcDate = qEnd;
          }

          const addOnDays = Math.max(0, addOnCalcDate.diff(moment(addOn.startDate), "days"));
          if (addOnDays <= 0) continue;

          // Only charge interest if amount is at least 5000 GHS
          if (addOn.amount < 5000) {
            addOn.accruedAddOnInterest = 0;
            await addOn.save();
            continue;
          }

          const dailyAddOnReturn = calculateDailyRate(
            addOn.amount,
            investment.guaranteedRate ?? 8,
            mandateQuarterDays
          );
          const addOnInterest = dailyAddOnReturn * addOnDays;
          addOn.accruedAddOnInterest = addOnInterest;
          await addOn.save();
          totalAddOnReturn += addOnInterest;
        }
      }
      investment.addOnAccruedReturn = totalAddOnReturn;

      // 3. Management Fee
      const grossReturn = principalReturn + totalAddOnReturn;
      const feeRate =
        investment.managementFeeRate !== undefined ? investment.managementFeeRate : 20;
      const managementFee = (grossReturn * feeRate) / 100;
      investment.managementFee = managementFee;

      // 4. Net Accrued Return
      const performanceYield = Number(investment.performanceYield || 0);
      const operationalCost = Number(investment.operationalCost || 0);
      const netReturn = Math.max(
        grossReturn + performanceYield - (managementFee + operationalCost),
        0
      );
      investment.totalAccruedReturn = netReturn;

      await investment.save({ validateBeforeSave: false });

      updatedCount++;
      totalGrossAccrued += principalReturn + totalAddOnReturn;
      totalManagementFees += managementFee;
      totalNetAccrued += netReturn;

      details.push({
        investmentId: investment._id,
        transactionId: investment.transactionId,
        daysActive: daysSinceStart,
        principalAccrued: principalReturn,
        addOnAccrued: totalAddOnReturn,
        managementFee,
        totalAccruedReturn: netReturn,
      });
    }

    const resultSummary = {
      activeMandatesChecked: investments.length,
      mandatesUpdated: updatedCount,
      quarterDays,
      totalGrossAccrued,
      totalManagementFees,
      totalNetAccrued,
      timestamp: new Date().toISOString(),
      details,
    };

    if (res) {
      return res.status(200).json({
        status: "success",
        message: `Daily accruals calculated successfully for ${updatedCount} active mandate(s)`,
        data: resultSummary,
      });
    }

    return resultSummary;
  } catch (err) {
    console.error("[AccrualsEngine] Error calculating daily accruals:", err);
    if (res && next) {
      return next(err);
    } else if (res) {
      return res.status(500).json({
        status: "error",
        message: err.message || "Failed to calculate daily accruals",
      });
    }
    throw err;
  }
};

