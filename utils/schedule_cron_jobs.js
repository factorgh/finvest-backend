import moment from "moment";
import cron from "node-cron";
import {
  archiveTransactions,
  rolloverInvestments,
} from "../features/investment/controller/investment.controller.js";
import Investment from "../features/investment/model/investment.model.js";
import JobStatus from "../features/investment/model/job_status.model.js";
import {
  calculateAccruedReturn,
  calculateDays,
  getQuarterEndDate,
} from "./handle_date_range.js";

const dailyAccruedReturnJob = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Starting daily update for accrued returns...");

    try {
      const currentDate = new Date();
      const jobName = "dailyAccruedReturn";

      // Log the current time and job name
      console.log(`Current date: ${currentDate}`);
      console.log(`Job name: ${jobName}`);

      // Fetch or initialize Job Status
      let jobStatus = await JobStatus.findOne({ jobName });
      if (!jobStatus) {
        console.log("No job status found, initializing...");
        jobStatus = await JobStatus.create({
          jobName,
          lastRun: moment().subtract(1, "days").toDate(),
        });
        console.log("Initialized Job Status:", jobStatus);
      }

      const lastRunDate = jobStatus.lastRun;
      const daysMissed = moment(currentDate).diff(moment(lastRunDate), "days");
      console.log(`Last run date: ${lastRunDate}`);
      console.log(`Days missed: ${daysMissed}`);

      // Ensure at least one day's calculation occurs
      const daysToProcess = daysMissed <= 0 ? 1 : daysMissed;

      for (let i = 1; i <= daysToProcess; i++) {
        const targetDate = moment(lastRunDate).add(i, "days").toDate();
        console.log(`Processing target date: ${targetDate}`);

        const investments = await Investment.find({ active: true }).populate(
          "addOns"
        );
        console.log(`Found ${investments.length} active investments`);

        for (const investment of investments) {
          console.log("(1)-----------------------Invesetment:", investment);
          console.log(`Processing investment ID: ${investment._id}`);

          try {
            const quarterEndDate = getQuarterEndDate(investment.startDate);
            console.log(`Quarter end date: ${quarterEndDate}`);
            console.log("(2)------------------------targetDate", targetDate);

            if (moment(targetDate).isSameOrAfter(quarterEndDate, "day")) {
              console.log(
                `Quarter has ended for investment ID: ${investment._id}`
              );
              await archiveTransactions();
              await rolloverInvestments(investment, quarterEndDate);

              // Proceed to log or handle quarter-end-specific logic but do not exit this investment loop.
              console.log(
                `Quarter rollover completed for investment ${investment._id}. Continuing updates...`
              );
            }

            // Date passed to days for principal calculations
            console.log(
              "(3)------------------------investment date ------------------------",
              investment.startDate
            );
            console.log(
              "(4)------------------------quarterEndDate",
              quarterEndDate
            );

            // Calculate principal accrued return
            const daysForPrincipal = calculateDays(
              investment.startDate,
              Math.min(targetDate, quarterEndDate)
            );
            console.log(`Days for principal: ${daysForPrincipal}`);

            const principalAccruedReturn = calculateAccruedReturn(
              investment.principal,
              investment.guaranteedRate,
              daysForPrincipal
            );
            console.log(
              `Principal accrued return for investment ID ${investment._id}: ${principalAccruedReturn}`
            );

            // Calculate add-on accrued return
            const addOnAccruedReturn = investment.addOns.reduce(
              (total, addOn) => {
                console.log(
                  `Processing addOn for investment ID: ${investment._id}`,
                  addOn
                );

                if (!addOn.amount || !addOn.startDate) {
                  console.warn(
                    `Invalid addOn found in investment ${investment._id}. Skipping.`,
                    addOn
                  );
                  return total;
                }

                const daysForAddOn = calculateDays(
                  addOn.startDate,
                  Math.min(targetDate, quarterEndDate)
                );
                console.log(`Days for addOn: ${daysForAddOn}`);

                const accruedReturn = calculateAccruedReturn(
                  addOn.amount,
                  investment.guaranteedRate,
                  daysForAddOn
                );
                console.log(`Accrued return for addOn: ${accruedReturn}`);

                return total + accruedReturn;
              },
              0
            );

            console.log(
              `Total add-on accrued return for investment ID ${investment._id}: ${addOnAccruedReturn}`
            );

            // Update investment
            investment.totalAccruedReturn +=
              principalAccruedReturn + addOnAccruedReturn;
            investment.addOnAccruedReturn += addOnAccruedReturn;
            await investment.save();
            console.log(`Investment ${investment._id} updated successfully.`);
          } catch (error) {
            console.error(
              `Error processing investment ${investment._id}:`,
              error
            );
          }
        }
      }

      jobStatus.lastRun = currentDate;
      await jobStatus.save();
      console.log("Updated job status last run date.");
    } catch (error) {
      console.error("Error during daily update:", error);
    }
  });
};

export default dailyAccruedReturnJob;
