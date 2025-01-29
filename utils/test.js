import moment from "moment";
import { calculateDailyRate } from "./halper.js";
import { getQuarterDetails } from "./handle_date_range.js";

const value = calculateDailyRate(50000, 8, 92);
console.log(value);

// Get quarter days
const quarterDays = getQuarterDetails();
console.log(quarterDays);

const currentDate = new Date();
const daysDiff = moment(currentDate).diff(currentDate, "days");
console.log(`Current date: ${currentDate}`);
console.log(`Days difference: ${daysDiff}`);

// Get the quarter details
