import moment from "moment"; // Using Moment.js for date operations
import cron from "node-cron";
import Loan from "../features/loans/loans.model.js"; // Import your Loan model

// Function to calculate overdue fee
const calculateOverdueFee = (amount, rate, daysElapsed) => {
  return (amount * rate * daysElapsed) / 100; // Assuming rate is a percentage
};

// Schedule the cron job
const dailyLoanDeductions = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily update for overdue loans...");

    try {
      // Get current date
      const currentDate = moment();

      // Fetch all active loans where dueDate is in the past
      const overdueLoans = await Loan.find({
        active: true,
        dueDate: { $lt: currentDate.toDate() },
      });

      for (const loan of overdueLoans) {
        try {
          // Calculate the number of overdue days
          const overdueDays = currentDate.diff(moment(loan.dueDate), "days");

          // Calculate the overdue fee for these overdue days
          const overdueFee = calculateOverdueFee(
            loan.amountDue,
            loan.overdueRate, // Assume `overdueRate` is stored in the loan document
            overdueDays
          );

          // Update the loan
          loan.overdueFee = (loan.overdueFee || 0) + overdueFee; // Add to existing overdueFee
          loan.overdueDays = overdueDays; // Update overdue days
          loan.amountDue += overdueFee; // Add overdue fee to the total amount due

          // Save the updated loan
          await loan.save();

          console.log(`Updated overdue loan: ${loan._id}`);
        } catch (error) {
          console.error(`Error updating loan ${loan._id}:`, error);
        }
      }

      console.log("Daily update for overdue loans completed successfully.");
    } catch (error) {
      console.error("Error during daily overdue loan update:", error);
    }
  });
};

export default dailyLoanDeductions;
