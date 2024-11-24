import dayjs from "dayjs";
import { getRateForDate } from "../features/investment/controller/rate_controller.js";
import { calculateDays } from "./handle_date_range.js";

export const calculateDynamicAccruedReturn = async (
  principal,
  startDate,
  endDate,
  rate
) => {
  const days = calculateDays(startDate, endDate);
  let totalAccrued = 0;

  for (let i = 0; i < days; i++) {
    const currentDate = dayjs(startDate).add(i, "day").toDate();
    const dailyRate = (await getRateForDate(currentDate)) / 100 / 365;
    totalAccrued += principal * dailyRate;
  }

  return totalAccrued;
};
