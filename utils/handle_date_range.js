import dayjs from "dayjs";

// Calculate the accrued return
export const calculateAccruedReturn = (principal, rate, days) => {
  console.log("Calculating accrued return...");

  if (!principal || isNaN(principal)) {
    throw new Error(`Invalid principal: ${principal}`);
  }
  if (!rate || isNaN(rate) || rate > 100) {
    throw new Error(`Invalid rate (must be between 0 and 100): ${rate}`);
  }
  if (days < 0 || isNaN(days)) {
    throw new Error(`Invalid days (cannot be negative): ${days}`);
  }

  const dailyRate = rate / 100; // Convert annual rate to daily rate
  return principal * dailyRate * days; // Calculate accrued return
};

// Determine the number of days between two dates
export const calculateDays = (startDate, endDate) => {
  console.log(startDate, endDate);
  console;
  if (!startDate || !endDate) {
    throw new Error(
      `StartDate or EndDate is missing: ${startDate}, ${endDate}`
    );
  }

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  if (!start.isValid() || !end.isValid()) {
    throw new Error(`Invalid dates provided: ${startDate}, ${endDate}`);
  }
  if (end.isBefore(start)) {
    throw new Error(
      `End date (${endDate}) is earlier than start date (${startDate})`
    );
  }

  return end.diff(start, "day"); // Calculate difference in days
};

// Get the end of the quarter for a given date
export const getQuarterEndDate = (date) => {
  const currentDate = dayjs(date);
  const month = currentDate.month();
  const year = currentDate.year();

  // Determine the quarter-end month
  let quarterEndMonth = 2; // Default to Q1
  if (month >= 3 && month <= 5) quarterEndMonth = 5; // Q2
  if (month >= 6 && month <= 8) quarterEndMonth = 8; // Q3
  if (month >= 9 && month <= 11) quarterEndMonth = 11; // Q4

  return dayjs(new Date(year, quarterEndMonth + 1, 0)); // Last day of the quarter
};

export const getQuarter = (date = new Date()) => {
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${date.getFullYear()}-Q${quarter}`;
};

export const isQuarterEnd = (date = new Date()) => {
  const month = date.getMonth() + 1;
  return (
    month % 3 === 0 &&
    date.getDate() === new Date(date.getFullYear(), month, 0).getDate()
  );
};
