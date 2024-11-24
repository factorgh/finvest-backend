import RateHistory from "./../model/rate_history.js";

export const getRateForDate = async (date) => {
  // Convert the date to a consistent format
  const targetDate = new Date(date);

  // Query the RateHistory collection for the most recent rate effective on or before the target date
  const rateHistory = await RateHistory.findOne({
    effectiveDate: { $lte: targetDate },
  }).sort({ effectiveDate: -1 }); // Sort by effectiveDate in descending order

  // Return the rate if found, otherwise use a default rate (e.g., 8%)
  return rateHistory ? rateHistory.rate : 8;
};
