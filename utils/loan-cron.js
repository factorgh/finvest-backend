import cron from "node-cron";
import moment from "moment";
import Loan from "../features/loans/loans.model.js";

/**
 * Calculates overdue fees based on loan amount, rate, and overdue days.
 */
const calculateOverdueFee = (amount, rate, days) => {
  if (amount <= 0 || rate <= 0 || days <= 0) return 0;
  return (amount * rate * days) / 100;
};

/**
 * Scheduled job to process overdue loans daily at 6 AM.
 */
const dailyLoanDeductions = () => {
  cron.schedule("0 6 * * *", async () => {
    const today = moment().startOf("day").toDate();
    console.log("[Loan Job] Running overdue loan processor...");

    try {
      const overdueLoans = await Loan.find({
        active: true,
        dueDate: { $lt: today }, // Loans due before today
      });

      console.log(`[Loan Job] Found ${overdueLoans.length} overdue loan(s).`);

      for (const loan of overdueLoans) {
        try {
          const daysOverdue = moment(today).diff(moment(loan.dueDate), "days");

          if (daysOverdue <= 0) continue;

          const rate = loan.overdueRate ?? 0;
          const overdueFee = calculateOverdueFee(
            loan.amountDue ?? 0,
            rate,
            daysOverdue
          );

          loan.overdueFee = (loan.overdueFee ?? 0) + overdueFee;
          loan.overdueDays = daysOverdue;
          loan.amountDue += overdueFee;

          await loan.save();
          console.log(
            `[Loan Job] Loan ${
              loan._id
            } updated with overdue fee: ${overdueFee.toFixed(2)}`
          );
        } catch (err) {
          console.error(`[Loan Job] Failed to update loan ${loan._id}:`, err);
        }
      }

      console.log("[Loan Job] Processing complete.");
    } catch (err) {
      console.error("[Loan Job] Error fetching overdue loans:", err);
    }
  });
};

export default dailyLoanDeductions;
