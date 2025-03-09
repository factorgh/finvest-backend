import moment from "moment"; // Date library
import cron from "node-cron";
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
    console.log("Starting daily overdue loan processing...");

    try {
      const currentDate = moment().startOf("day").toDate();

      // Find all active loans that are overdue
      const overdueLoans = await Loan.find({
        active: true,
        dueDate: { $gt: currentDate }, // Loans with due dates before today
      });

      console.log(`Found ${overdueLoans.length} overdue loans.`);

      for (const loan of overdueLoans) {
        try {
          const overdueDays = moment(currentDate).diff(
            moment(loan.dueDate),
            "days"
          );

          console.log(`Loan ${loan._id} is overdue by ${overdueDays} days.`);

          // Calculate overdue fee
          // const overdueFee = calculateOverdueFee(
          //   loan.amountDue || 0,
          //   loan.overdueRate || 0,
          //   overdueDays
          // );

          const overdueFee = overdueDays * loan.overdueRate || 0;
          console.log(
            `Calculated overdue fee for loan ${loan._id}: ${overdueFee.toFixed(
              2
            )}`
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

      console.log("Daily overdue loan update completed successfully.");
    } catch (error) {
      console.error("Error during daily loan update:", error);
    }
  });
};

export default dailyLoanDeductions;
