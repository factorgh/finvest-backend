import moment from "moment";
import cron from "node-cron";
import { archiveTransactions } from "../features/investment/controller/investment.controller.js";
import Investment from "../features/investment/model/investment.model.js";
import JobStatus from "../features/investment/model/job_status.model.js";
import {
  calculateAccruedReturn,
  calculateDays,
  getQuarterEndDate,
} from "./handle_date_range.js";

const calculateDailyAddOnAccruedReturn = (amount, guaranteedRate) => {
  return (amount * guaranteedRate) / 100;
};

const dailyAccruedReturnJob = () => {
  cron.schedule("* * * * *", async () => {
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

      console.log(
        "(1)------------------------------JOB STATUS SECTION END---------------------------"
      );

      // Ensure at least one day's calculation occurs
      const daysToProcess = daysMissed <= 0 ? 1 : daysMissed;

      for (let i = 1; i <= daysToProcess; i++) {
        const targetDate = moment(lastRunDate).add(i, "days").toDate();
        console.log(`Processing target date: ${targetDate}`);

        const investments = await Investment.find({ active: true }).populate(
          "addOns"
        );
        console.log(`Found ${investments.length} active investments`);
        console.log(
          "(2)------------------------------ACTIVE INVESTMENTS END---------------------------"
        );

        for (const investment of investments) {
          console.log(
            `(3)Processing investment ID-------------------------------------------------: ${investment._id}`
          );

          try {
            const quarterEndDate = getQuarterEndDate(investment.startDate);
            console.log(`Quarter end date: ${quarterEndDate}`);
            console.log("(4)------------------------targetDate", targetDate);

            if (moment(targetDate).isSameOrAfter(quarterEndDate, "day")) {
              console.log(
                `Condition true: Quarter has ended for investment ID: ${investment._id}.`
              );
              console.log(
                `targetDate: ${targetDate}, quarterEndDate: ${quarterEndDate}`
              );

              await archiveTransactions();
              // await rolloverInvestments(investment, quarterEndDate);

              // Proceed to log or handle quarter-end-specific logic but do not exit this investment loop.
              console.log(
                `Quarter rollover completed for investment ${investment._id}. Continuing updates...`
              );
            } else {
              console.log(
                `Condition false: Quarter has not ended for investment ID: ${investment._id}.`
              );
              console.log(
                `targetDate: ${targetDate}, quarterEndDate: ${quarterEndDate}`
              );
            }

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

            // const addOnAccruedReturn += investment.addOnAccruedReturn;

            // Calculate add-on accrued return
            let totalAddOnAccruedReturn = investment.addOnAccruedReturn || 0;

            for (const addOn of investment.addOns) {
              console.log(
                `Processing add-on: ${addOn.name} for investment ID: ${investment._id}`
              );

              // Calculate the daily return for the add-on
              const dailyAddOnReturn = calculateDailyAddOnAccruedReturn(
                addOn.amount,
                investment.guaranteedRate
              );

              console.log(
                `Calculated daily return for add-on: ${addOn.name}, Amount: ${addOn.amount}, Rate: ${addOn.guaranteedRate}, Daily Return: ${dailyAddOnReturn}`
              );

              // Accumulate the total add-on accrued return
              totalAddOnAccruedReturn += dailyAddOnReturn;
            }

            console.log(
              `Total add-on accrued return for investment ID ${investment._id}: ${totalAddOnAccruedReturn} `
            );

            // Update investment
            investment.totalAccruedReturn +=
              principalAccruedReturn + totalAddOnAccruedReturn;
            investment.addOnAccruedReturn += totalAddOnAccruedReturn;
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
