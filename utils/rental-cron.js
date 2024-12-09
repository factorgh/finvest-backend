import moment from "moment"; // For date operations
import cron from "node-cron";
import Rental from "../features/rentals/rentals.model.js"; // Import your Rental model

const dailyRentalUpdates = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily update for rentals...");

    try {
      // Get current date
      const currentDate = moment();

      // Fetch all active rentals with a return date earlier than the current date
      const overdueRentals = await Rental.find({
        active: true,
        returnDate: { $lt: currentDate.toDate() },
      });

      for (const rental of overdueRentals) {
        try {
          // Calculate the number of overdue days
          const overdueDays = currentDate.diff(
            moment(rental.returnDate),
            "days"
          );

          // Calculate the overdue fee for these overdue days
          const overdueFee = rental.dailyOverdueRate * overdueDays; // Assuming `dailyOverdueRate` is stored in the rental document

          // Update the rental
          rental.overdueDays = overdueDays;
          rental.overdueFee = (rental.overdueFee || 0) + overdueFee; // Add to existing overdue fee
          rental.amountDue += overdueFee; // Add overdue fee to the total amount due

          // Save the updated rental
          await rental.save();

          console.log(`Updated overdue rental: ${rental._id}`);
        } catch (error) {
          console.error(`Error updating rental ${rental._id}:`, error);
        }
      }

      console.log("Daily rental updates completed successfully.");
    } catch (error) {
      console.error("Error during daily rental update:", error);
    }
  });
};

export default dailyRentalUpdates;
