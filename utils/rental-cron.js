import moment from "moment"; // For date operations
import cron from "node-cron";
import JobStatus from "../features/investment/model/job_status.model.js"; // Job status model
import Rental from "../features/rentals/rentals.model.js"; // Rental model

// Function to calculate overdue fee
const calculateOverdueFee = (amount, dailyRate, daysElapsed) => {
  if (amount <= 0 || dailyRate <= 0 || daysElapsed <= 0) {
    console.warn("Invalid inputs for overdue fee calculation:", {
      amount,
      dailyRate,
      daysElapsed,
    });
    return 0;
  }
  return (amount * dailyRate * daysElapsed) / 100; // Assuming dailyRate is percentage-based
};

const dailyRentalUpdates = () => {
  cron.schedule("0 6 * * *", async () => {
    console.log("Starting daily updates for rentals...");

    try {
      const currentDate = new Date();
      const jobName = "dailyRentalUpdates";

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

      if (daysMissed >= 0) {
        console.log(
          `Missed ${daysMissed} days. Processing updates for overdue rentals...`
        );

        for (let i = 1; i <= daysMissed; i++) {
          const targetDate = moment(lastRunDate).add(i, "days").toDate();
          console.log(`Processing rentals for target date: ${targetDate}`);

          const overdueRentals = await Rental.find({
            active: true,
            returnDate: { $lt: targetDate },
          });

          console.log(
            `Found ${overdueRentals.length} overdue rentals for date: ${targetDate}`
          );

          for (const rental of overdueRentals) {
            try {
              console.log(`Processing rental ID: ${rental._id}`);

              // Calculate overdue days
              const overdueDays = moment(targetDate).diff(
                moment(rental.returnDate),
                "days"
              );
              console.log(
                `Rental ID ${rental._id} is overdue by ${overdueDays} days.`
              );

              // Calculate overdue fee
              const overdueFee = calculateOverdueFee(
                rental.amountDue || 0,
                rental.dailyOverdueRate || 0,
                overdueDays
              );
              console.log(
                `Calculated overdue fee for rental ID ${
                  rental._id
                }: ${overdueFee.toFixed(2)}`
              );

              // Update rental
              rental.overdueDays = overdueDays;
              rental.overdueFee = (rental.overdueFee || 0) + overdueFee; // Add to existing overdue fee
              rental.amountDue += overdueFee; // Add overdue fee to total due amount

              await rental.save();
              console.log(`Rental ID ${rental._id} updated successfully.`);
            } catch (error) {
              console.error(`Error updating rental ${rental._id}:`, error);
            }
          }
        }

        // Update job status last run date
        jobStatus.lastRun = currentDate;
        await jobStatus.save();
        console.log("Updated job status last run date.");
      } else {
        console.log("No missed updates. All caught up!");
      }

      console.log("Daily rental updates completed successfully.");
    } catch (error) {
      console.error("Error during daily rental update:", error);
    }
  });
};

export default dailyRentalUpdates;
