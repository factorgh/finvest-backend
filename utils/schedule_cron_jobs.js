import dayjs from "dayjs";
import cron from "node-cron";
import {
  archiveTransactions,
  rolloverInvestments,
} from "../features/investment/controller/investment.controller.js";
import Investment from "../features/investment/model/investment.model.js";
import JobStatus from "../features/investment/model/job_status.model.js";
import { getQuarterEndDate } from "./handle_date_range.js";

cron.schedule("0 0 * * *", async () => {
  console.log("Running daily update for accrued returns...");

  try {
    const currentDate = new Date();
    const jobName = "dailyAccruedReturn";

    // Step 1: Fetch or initialize job status
    let jobStatus = await JobStatus.findOne({ jobName });
    if (!jobStatus) {
      jobStatus = await JobStatus.create({
        jobName,
        lastRun: dayjs().subtract(1, "day").toDate(),
      });
    }

    const lastRunDate = jobStatus.lastRun;
    const daysMissed = dayjs(currentDate).diff(dayjs(lastRunDate), "day");

    if (daysMissed > 0) {
      console.log(`Missed ${daysMissed} days. Processing updates...`);

      for (let i = 1; i <= daysMissed; i++) {
        const targetDate = dayjs(lastRunDate).add(i, "day").toDate();
        console.log(`Processing updates for date: ${targetDate}`);

        // Step 2: Fetch active investments
        const investments = await Investment.find({ active: true });

        for (const investment of investments) {
          try {
            const quarterEndDate = getQuarterEndDate(investment.creationDate);

            // Check if quarter ended
            if (dayjs(targetDate).isSameOrAfter(quarterEndDate, "day")) {
              console.log(
                `Quarter ended for investment ${investment._id}. Rolling over...`
              );
              await archiveTransactions();
              await rolloverInvestments(investment, quarterEndDate); // Trigger rollover logic
              continue;
            }

            // Accrual calculations
            const daysForPrincipal = calculateDays(
              investment.creationDate,
              Math.min(targetDate, quarterEndDate)
            );

            const principalAccruedReturn = calculateAccruedReturn(
              investment.principal,
              investment.guaranteedRate,
              daysForPrincipal
            );

            // Calculate add-ons and one-offs returns
            const addOnAccruedReturn = investment.addOns.reduce(
              (total, addOn) => {
                const daysForAddOn = calculateDays(
                  addOn.dateOfEntry,
                  Math.min(targetDate, quarterEndDate)
                );
                return (
                  total +
                  calculateAccruedReturn(addOn.amount, addOn.rate, daysForAddOn)
                );
              },
              0
            );

            const oneOffAccruedReturn = investment.oneOffs.reduce(
              (total, oneOff) => {
                const daysForOneOff = calculateDays(
                  oneOff.dateOfEntry,
                  Math.min(targetDate, quarterEndDate)
                );
                return (
                  total +
                  calculateAccruedReturn(
                    oneOff.amount,
                    oneOff.rate,
                    daysForOneOff
                  )
                );
              },
              0
            );

            // Update accrued returns and save
            investment.accruedReturn =
              principalAccruedReturn + addOnAccruedReturn + oneOffAccruedReturn;
            await investment.save();
          } catch (error) {
            console.error(
              `Error processing investment ${investment._id}:`,
              error
            );
          }
        }
      }

      // Step 3: Update last run timestamp
      jobStatus.lastRun = currentDate;
      await jobStatus.save();
    } else {
      console.log("No missed updates. All caught up!");
    }

    console.log("Daily update completed successfully.");
  } catch (error) {
    console.error("Error during daily update:", error);
  }
});
