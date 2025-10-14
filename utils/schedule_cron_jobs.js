import cron from "node-cron";
import moment from "moment";
import Investment from "../features/investment/model/investment.model.js";
import { calculateDailyRate } from "./halper.js";
import { getQuarterDetails } from "./handle_date_range.js";

const dailyAccruedReturnJob = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log(
      "[AccruedReturnJob] Starting daily return calculation at midnight..."
    );

    try {
      const currentDate = moment();
      const quarterDays = getQuarterDetails();

      const investments = await Investment.find().populate([
        "addOns",
        "oneOffs",
      ]);
      console.log(
        `[AccruedReturnJob] Processing ${investments.length} investment(s)`
      );

      for (const investment of investments) {
        const daysSinceStart = currentDate.diff(
          moment(investment.startDate),
          "days"
        );
        if (daysSinceStart <= 0) continue;

        // ----- Principal Return Calculation -----
        const principalDailyReturn = calculateDailyRate(
          investment.principal,
          investment.guaranteedRate,
          quarterDays
        );
        const principalReturn = principalDailyReturn * daysSinceStart;
        investment.principalAccruedReturn = principalReturn;

        // ----- Add-on Interest Calculation -----
        let totalAddOnReturn = 0;
        for (const addOn of investment.addOns) {
          if (addOn.status !== "active") continue;

          const addOnDays = currentDate.diff(moment(addOn.startDate), "days");
          if (addOnDays <= 0) continue;

          const dailyAddOnReturn = calculateDailyRate(
            addOn.amount,
            investment.guaranteedRate,
            quarterDays
          );

          const addOnInterest = dailyAddOnReturn * addOnDays;
          addOn.accruedAddOnInterest = addOnInterest;
          totalAddOnReturn += addOnInterest;
        }

        // Save add-on updates (after loop to reduce save calls)
        await investment.save();

        investment.addOnAccruedReturn = totalAddOnReturn;

        // ----- Management Fee Calculation -----
        const grossReturn = principalReturn + totalAddOnReturn;
        const managementFee =
          (grossReturn * investment.managementFeeRate) / 100;
        investment.managementFee = managementFee;

        // ----- Total Accrued Return -----
        investment.totalAccruedReturn =
          grossReturn +
          investment.performanceYield -
          (managementFee + investment.operationalCost);

        await investment.save();

        console.log(
          `[AccruedReturnJob] Updated investment ${
            investment._id
          } | Principal: ${principalReturn.toFixed(
            2
          )}, Add-ons: ${totalAddOnReturn.toFixed(
            2
          )}, Total: ${investment.totalAccruedReturn.toFixed(2)}`
        );
      }

      console.log("[AccruedReturnJob] Daily return calculation completed.");
    } catch (error) {
      console.error("[AccruedReturnJob] Error:", error.message);
    }
  });
};

export default dailyAccruedReturnJob;
