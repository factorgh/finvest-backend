import moment from "moment"; // Date library
import cron from "node-cron";
import JobStatus from "../features/investment/model/job_status.model.js"; // Job status model
import Loan from "../features/loans/loans.model.js"; // Loan model

// Function to calculate overdue fee
const calculateOverdueFee = (amount, rate, daysElapsed) => {
  if (amount <= 0 || rate <= 0 || daysElapsed <= 0) {
    console.warn("Invalid inputs for overdue fee calculation:", {
      amount,
      rate,
      daysElapsed,
    });
    return 0;
  }
  return (amount * rate * daysElapsed) / 100;
};

const dailyLoanDeductions = () => {
  cron.schedule("0 6 * * *", async () => {
    // Execute every minute (adjust to "0 0 * * *" for daily)
    console.log("Starting daily update for overdue loans...");

    try {
      const currentDate = new Date();
      const jobName = "dailyLoanDeductions";

      // Fetch or Initialize Job Status
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

      if (daysMissed > 0) {
        console.log(
          `Missed ${daysMissed} days. Processing updates for overdue loans...`
        );

        for (let i = 1; i <= daysMissed; i++) {
          const targetDate = moment(lastRunDate).add(i, "days").toDate();
          console.log(`Processing loans for target date: ${targetDate}`);

          const overdueLoans = await Loan.find({
            active: true,
            dueDate: { $lt: targetDate },
          });

          console.log(
            `Found ${overdueLoans.length} overdue loans for date: ${targetDate}`
          );

          for (const loan of overdueLoans) {
            try {
              const overdueDays = moment(targetDate).diff(
                moment(loan.dueDate),
                "days"
              );
              console.log(
                `Loan ${loan._id} is overdue by ${overdueDays} days.`
              );

              // Calculate overdue fee
              const overdueFee = calculateOverdueFee(
                loan.amountDue || 0,
                loan.overdueRate || 0,
                overdueDays
              );

              console.log(
                `Calculated overdue fee for loan ${
                  loan._id
                }: ${overdueFee.toFixed(2)}`
              );

              // Update loan
              loan.overdueFee = (loan.overdueFee || 0) + overdueFee;
              loan.overdueDays = overdueDays;
              loan.amountDue += overdueFee;

              await loan.save();
              console.log(`Loan ${loan._id} updated successfully.`);
            } catch (error) {
              console.error(`Error updating loan ${loan._id}:`, error);
            }
          }
        }

        jobStatus.lastRun = currentDate;
        await jobStatus.save();
        console.log("Updated job status last run date.");
      } else {
        console.log("No missed updates. All caught up!");
      }

      console.log("Daily overdue loan update completed successfully.");
    } catch (error) {
      console.error("Error during daily loan update:", error);
    }
  });
};

export default dailyLoanDeductions;
