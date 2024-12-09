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
  cron.schedule("* * * * *", async () => {
    console.log("Running daily update for accrued returns...");
    try {
      const currentDate = new Date();
      const jobName = "dailyAccruedReturn";
      let jobStatus = await JobStatus.findOne({ jobName });
      if (!jobStatus) {
        jobStatus = await JobStatus.create({
          jobName,
          lastRun: moment().subtract(1, "days").toDate(),
        });
      }
      const lastRunDate = jobStatus.lastRun;
      const daysMissed = moment(currentDate).diff(moment(lastRunDate), "days");

      if (daysMissed > 0) {
        console.log(`Missed ${daysMissed} days. Processing updates...`);
        for (let i = 1; i <= daysMissed; i++) {
          const targetDate = moment(lastRunDate).add(i, "days").toDate();
          console.log(`Processing updates for date: ${targetDate}`);
          const investments = await Investment.find({ active: true });
          for (const investment of investments) {
            try {
              const quarterEndDate = getQuarterEndDate(investment.creationDate);
              if (moment(targetDate).isSameOrAfter(quarterEndDate, "day")) {
                console.log(
                  `Quarter ended for investment ${investment._id}. Rolling over...`
                );
                await archiveTransactions();
                await rolloverInvestments(investment, quarterEndDate);
                continue;
              }
              const daysForPrincipal = calculateDays(
                investment.creationDate,
                Math.min(targetDate, quarterEndDate)
              );
              const principalAccruedReturn = calculateAccruedReturn(
                investment.principal,
                investment.guaranteedRate,
                daysForPrincipal
              );
              const addOnAccruedReturn = investment.addOns.reduce(
                (total, addOn) => {
                  const daysForAddOn = calculateDays(
                    addOn.dateOfEntry,
                    Math.min(targetDate, quarterEndDate)
                  );
                  return (
                    total +
                    calculateAccruedReturn(
                      addOn.amount,
                      investment.guaranteedRate,
                      daysForAddOn
                    )
                  );
                },
                0
              );
              investment.addOnAccruedReturn += addOnAccruedReturn;

              investment.totalAccruedReturn =
                principalAccruedReturn +
                addOnAccruedReturn +
                (await investment.save());
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
      } else {
        console.log("No missed updates. All caught up!");
      }
      console.log("Daily update completed successfully.");
    } catch (error) {
      console.error("Error during daily update:", error);
    }
  });
};

export default dailyAccruedReturnJob;
