import moment from "moment";
import Investment from "../features/investment/model/investment.model.js";
import { calculateDailyRate } from "./halper.js";
import { calculateDays30360 } from "./handle_date_range.js";

export const recalculateInvestment = async (investmentId) => {
  try {
    const investment = await Investment.findById(investmentId).populate([
      "addOns",
      "oneOffs",
    ]);
    if (!investment) {
      console.warn(`[Recalculate] Investment ${investmentId} not found`);
      return;
    }

    const currentDate = moment();
    const calculationEndDate = moment.min(currentDate, moment(investment.quarterEndDate));
    const quarterDays = 90;

    const daysSinceStart = calculateDays30360(investment.startDate, calculationEndDate);

    console.log(
      `[Day Count Log] Investment ID: ${investmentId} | Start Date: ${moment(investment.startDate).format("YYYY-MM-DD")} | End Date: ${calculationEndDate.format("YYYY-MM-DD")} | Resulting Day Count: ${daysSinceStart}`
    );

    // ----- Principal Return Calculation -----
    let principalReturn = 0;
    if (daysSinceStart > 0) {
      const principalDailyReturn = calculateDailyRate(
        investment.principal,
        investment.guaranteedRate,
        quarterDays
      );
      principalReturn = principalDailyReturn * daysSinceStart;
    }
    investment.principalAccruedReturn = principalReturn;

    // ----- Add-on Interest Calculation -----
    let totalAddOnReturn = 0;
    for (const addOn of investment.addOns) {
      if (addOn.status !== "active") continue;

      const addOnEndDate = moment.min(currentDate, moment(investment.quarterEndDate));
      const addOnDays = calculateDays30360(addOn.startDate, addOnEndDate);

      console.log(
        `[Day Count Log] AddOn ID: ${addOn._id} | Start Date: ${moment(addOn.startDate).format("YYYY-MM-DD")} | End Date: ${addOnEndDate.format("YYYY-MM-DD")} | Resulting Day Count: ${addOnDays}`
      );

      if (addOnDays <= 0) {
        addOn.accruedAddOnInterest = 0;
        await addOn.save();
        continue;
      }

      // Only charge interest if amount is at least 5000 GHS
      if (addOn.amount < 5000) {
        addOn.accruedAddOnInterest = 0;
        await addOn.save();
        continue;
      }

      const dailyAddOnReturn = calculateDailyRate(
        addOn.amount,
        investment.guaranteedRate,
        quarterDays
      );

      const addOnInterest = dailyAddOnReturn * addOnDays;
      addOn.accruedAddOnInterest = addOnInterest;
      await addOn.save(); // Persist the add-on document update
      totalAddOnReturn += addOnInterest;
    }

    investment.addOnAccruedReturn = totalAddOnReturn;

    // ----- Service Fee Calculation -----
    const grossReturn = principalReturn + totalAddOnReturn;
    const managementFee =
      (grossReturn * investment.managementFeeRate) / 100;
    investment.managementFee = managementFee;

    // ----- Total Accrued Return -----
    investment.totalAccruedReturn = Math.max(
      grossReturn +
      investment.performanceYield -
      (managementFee + investment.operationalCost),
      0
    );

    await investment.save();
    console.log(
      `[Recalculate] Updated investment ${investment._id} | Principal: ${principalReturn.toFixed(
        2
      )}, Add-ons: ${totalAddOnReturn.toFixed(
        2
      )}, Total: ${investment.totalAccruedReturn.toFixed(2)}`
    );
  } catch (error) {
    console.error("[Recalculate] Error recalculating investment:", error.message || error);
  }
};
