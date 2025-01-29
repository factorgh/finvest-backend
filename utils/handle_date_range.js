import dayjs from "dayjs";
import moment from "moment";

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
// export const getQuarterEndDate = (date) => {
//   console.log("Calculating quarter end...", date);
//   const currentDate = dayjs(date);
//   const month = currentDate.month(); // 0-indexed
//   const year = currentDate.year();

//   // Determine the quarter-end month (0-indexed: Feb, May, Aug, Nov)
//   let quarterEndMonth = 2; // Default to Q1
//   if (month >= 3 && month <= 5) quarterEndMonth = 5; // Q2
//   else if (month >= 6 && month <= 8) quarterEndMonth = 8; // Q3
//   else if (month >= 9 && month <= 11) quarterEndMonth = 11; // Q4

//   // Create the last day of the quarter
//   return dayjs(new Date(year, quarterEndMonth + 1, 0)); // Last day of the quarter
// };
export const getQuarterEndDate = (date) => {
  const currentDate = moment(date);
  const month = currentDate.month(); // 0-based index

  // Calculate quarter-end month (Feb = 2, May = 5, Aug = 8, Nov = 11)
  const quarterEndMonth = Math.floor(month / 3) * 3 + 2; // Finds last month of the quarter

  // Get the last day of the calculated quarter-end month
  const quarterEndDate = moment()
    .year(currentDate.year())
    .month(quarterEndMonth)
    .endOf("month"); // Last day of the month

  return quarterEndDate;
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

// Get quarter days
// export const getQuarterDetails = (date = new Date()) => {
//   const year = date.getFullYear();
//   const quarter = Math.ceil((date.getMonth() + 1) / 3);

//   // Calculate the start and end dates of the quarter
//   const startMonth = (quarter - 1) * 3; // 0 for Q1, 3 for Q2, 6 for Q3, 9 for Q4
//   const startDate = new Date(year, startMonth, 1);
//   const endDate = new Date(year, startMonth + 3, 0); // Last day of the quarter

//   // Get the total number of days in the quarter
//   const daysInQuarter = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

//   return {
//     quarter: `${year}-Q${quarter}`,
//     daysInQuarter,
//     startDate: startDate.toISOString().split("T")[0], // Optional, formatted as YYYY-MM-DD
//     endDate: endDate.toISOString().split("T")[0],     // Optional, formatted as YYYY-MM-DD
//   };
// };
export const getQuarterDetails = (date = new Date()) => {
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);

  // Calculate the start and end dates of the quarter
  const startMonth = (quarter - 1) * 3; // 0 for Q1, 3 for Q2, 6 for Q3, 9 for Q4
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0); // Last day of the quarter

  // Get the total number of days in the quarter
  const daysInQuarter = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

  return daysInQuarter;
};
