import dayjs from "dayjs";

// Calculate accrued return
export const calculateAccruedReturn = (principal, rate, days) => {
  const dailyRate = rate / 100 / 365;
  return principal * dailyRate * days;
};

// Determine the number of days between two dates
export const calculateDays = (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  return end.diff(start, "day"); // Difference in days
};

// Get the end of the quarter for a given date
export const getQuarterEndDate = (date) => {
  const currentDate = dayjs(date);
  const month = currentDate.month();
  const year = currentDate.year();

  // Determine the quarter end month
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
