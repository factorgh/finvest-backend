import cron from "node-cron";
import moment from "moment";
import Rental from "../features/rentals/rentals.model.js";

/**
 * Calculates the overdue fee for a rental.
 * @param {number} amount - Current due amount
 * @param {number} dailyRate - Daily overdue rate in percentage
 * @param {number} days - Number of overdue days
 */
const calculateOverdueFee = (amount, dailyRate, days) => {
  if (amount <= 0 || dailyRate <= 0 || days <= 0) return 0;
  return (amount * dailyRate * days) / 100;
};

/**
 * Scheduled job to process overdue rentals daily at 6 AM.
 */
const dailyRentalUpdates = () => {
  cron.schedule("0 6 * * *", async () => {
    const today = moment().startOf("day").toDate();
    console.log("[Rental Job] Starting daily overdue rental processing...");

    try {
      const overdueRentals = await Rental.find({
        active: true,
        returnDate: { $lt: today }, // Rentals due before today
      });

      console.log(
        `[Rental Job] Found ${overdueRentals.length} overdue rental(s).`
      );

      for (const rental of overdueRentals) {
        try {
          const daysOverdue = moment(today).diff(
            moment(rental.returnDate),
            "days"
          );
          if (daysOverdue <= 0) continue;

          const rate = rental.dailyOverdueRate ?? 0;
          const overdueFee = calculateOverdueFee(
            rental.amountDue ?? 0,
            rate,
            daysOverdue
          );

          rental.overdueDays = daysOverdue;
          rental.overdueFee = (rental.overdueFee ?? 0) + overdueFee;
          rental.amountDue += overdueFee;

          await rental.save();
          console.log(
            `[Rental Job] Rental ${
              rental._id
            } updated with overdue fee: ${overdueFee.toFixed(2)}`
          );
        } catch (err) {
          console.error(
            `[Rental Job] Failed to update rental ${rental._id}:`,
            err
          );
        }
      }

      console.log("[Rental Job] Daily rental processing completed.");
    } catch (err) {
      console.error("[Rental Job] Error during rental processing:", err);
    }
  });
};

export default dailyRentalUpdates;
