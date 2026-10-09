import cron from "node-cron";
import { calculateDailyAccruals } from "../features/investment/controller/investment.controller.js";

/**
 * Daily Accrued Return Job
 * Runs internal cron at midnight (00:00 every day) for standalone server deployments.
 * Reuses the central calculateDailyAccruals calculation engine.
 */
const dailyAccruedReturnJob = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log(
      "[AccruedReturnJob] Starting automated daily accruals calculation at midnight..."
    );

    try {
      const result = await calculateDailyAccruals();
      console.log(
        `[AccruedReturnJob] Successfully processed ${result.mandatesUpdated} active mandate(s). Net Accrued: GHS ${result.totalNetAccrued?.toFixed(2)}`
      );
    } catch (error) {
      console.error("[AccruedReturnJob] Error calculating daily accruals:", error.message);
    }
  });
};

export default dailyAccruedReturnJob;
