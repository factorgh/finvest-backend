import cron from "node-cron";
import Investment from "../features/investment/model/investment.model.js";
import { calculateDailyRate } from "./halper.js";
import { getQuarterDetails } from "./handle_date_range.js";
// import moment from "moment";

// import {
//   archiveTransactions,
//   rolloverInvestments,
// } from "../features/investment/controller/investment.controller.js";
// import JobStatus from "../features/investment/model/job_status.model.js";
// import { getQuarterEndDate } from "./handle_date_range.js";

// const calculateDailyAddOnAccruedReturn = (amount, guaranteedRate) => {
//   return (amount * guaranteedRate) / 100;
// };
// const calculateDailyTotalAccruedReturn = (amount, guaranteedRate) => {
//   return (amount * guaranteedRate) / 100;
// };

// const dailyAccruedReturnJob = () => {
//   cron.schedule(
//     // "0 8 * * *",
//     "40 20 * * *",
//     async () => {
//       console.log(
//         `[${moment().format()}] Starting daily update for accrued returns...`
//       );

//       try {
//         // GET THE CURRENT DATA AND ALSO JOB THAT HAS ALREADY RUN
//         const currentDate = new Date();
//         const jobName = "dailyAccruedReturn";

//         // Log the current time and job name
//         console.log(`Current date: ${currentDate}`);
//         console.log(`Job name: ${jobName}`);

//         // Fetch or initialize Job Status
//         let jobStatus = await JobStatus.findOne({ jobName });
//         if (!jobStatus) {
//           console.log("No job status found, initializing...");
//           jobStatus = await JobStatus.create({
//             jobName,
//             lastRun: moment().subtract(1, "days").toDate(),
//           });
//           console.log("Initialized Job Status:", jobStatus);
//         }

//         const lastRunDate = jobStatus.lastRun;

//         const daysMissed = moment(currentDate).diff(
//           moment(lastRunDate),
//           "days"
//         );
//         console.log(`Last run date: ${lastRunDate}`);
//         console.log(
//           `----------------------------------------------------Days missed: ${daysMissed}`
//         );

//         console.log(
//           "(1)------------------------------JOB STATUS SECTION END---------------------------"
//         );

//         // Ensure at least one day's calculation occurs
//         const daysToProcess = daysMissed <= 0 ? 1 : daysMissed;
//         console.log(
//           `----------------------------------------------------------(*)Days to process: ${daysToProcess}`
//         );

//         for (let i = 1; i <= daysToProcess; i++) {
//           const targetDate = moment(lastRunDate).add(i, "days").toDate();
//           console.log(`Processing target date: ${targetDate}`);

//           const investments = await Investment.find({ active: true }).populate(
//             "addOns"
//           );
//           console.log(`Found ${investments.length} active investments`);
//           console.log(
//             "(2)------------------------------ACTIVE INVESTMENTS END---------------------------"
//           );

//           for (const investment of investments) {
//             console.log(
//               `(3)Processing investment ID-------------------------------------------------: ${investment._id}`
//             );

//             try {
//               const quarterEndDate = getQuarterEndDate(investment.startDate);
//               const normalizedTargetDate = moment(targetDate).startOf("day");
//               const normalizedQuarterEndDate =
//                 moment(quarterEndDate).startOf("day");

//               if (normalizedTargetDate >= normalizedQuarterEndDate) {
//                 console.log(`Condition true: Archiving`);
//                 console.log(
//                   `targetDate: ${normalizedTargetDate}, quarterEndDate: ${normalizedQuarterEndDate}`
//                 );

//                 await archiveTransactions();
//                 await rolloverInvestments(investment, quarterEndDate);

//                 console.log(
//                   `Quarter rollover completed for investment ${investment._id}. Continuing updates...`
//                 );
//               } else {
//                 console.log(`Condition false: Not yet`);
//                 console.log(
//                   `targetDate: ${normalizedTargetDate}, quarterEndDate: ${normalizedQuarterEndDate}`
//                 );
//               }

//               let totalAddOnAccruedReturn = investment.addOnAccruedReturn || 0;

//               for (const addOn of investment.addOns) {
//                 console.log(
//                   `Processing add-on: ${addOn.name} for investment ID: ${investment._id}`
//                 );

//                 // Calculate the daily return for the add-on
//                 const dailyAddOnReturn = calculateDailyAddOnAccruedReturn(
//                   addOn.amount,
//                   investment.guaranteedRate
//                 );

//                 console.log(
//                   `Calculated daily return for add-on: ${addOn.name}, Amount: ${addOn.amount}, Rate: ${addOn.guaranteedRate}, Daily Return: ${dailyAddOnReturn}`
//                 );

//                 // Accumulate the total add-on accrued return
//                 totalAddOnAccruedReturn += dailyAddOnReturn;
//               }

//               console.log(
//                 `Total add-on accrued return for investment ID ${investment._id}: ${totalAddOnAccruedReturn} `
//               );

//               // Update investment
//               // const principalReturn = calculateDailyTotalAccruedReturn(
//               //   investment.principal,
//               //   investment.guaranteedRate
//               // );

//               console.log(
//                 "(*)------------------------------INVESTMENT SECTION START---------------------------"
//               );
//               let principalReturn;
//               if (daysMissed) {
//                 // Get days missed and multiply days missed by expected return and add it to the total investment
//                 principalReturn =
//                   investment.expectedReturnHolder * Number(daysMissed);
//               }
//               investment.addOnAccruedReturn += totalAddOnAccruedReturn;

//               // Calculate total accrued return for the investment
//               investment.totalAccruedReturn +=
//                 principalReturn + totalAddOnAccruedReturn;

//               console.log(
//                 "-----------------------------------------------------"
//               );

//               investment.principalAccruedReturn += principalReturn;
//               investment.addOnAccruedReturn += totalAddOnAccruedReturn;

//               // Caclculate management fee on daily bases
//               investment.managementFee =
//                 (investment.managementFeeRate * investment.totalAccruedReturn) /
//                 100;
//               await investment.save();
//               console.log(`Investment ${investment._id} updated successfully.`);
//             } catch (error) {
//               console.error(
//                 `Error processing investment ${investment._id}:`,
//                 error
//               );
//             }
//           }
//         }

//         jobStatus.lastRun = currentDate;
//         await jobStatus.save();
//         console.log("Updated job status last run date.");
//       } catch (error) {
//         console.error("Error during daily update:", error);
//       }
//     },
//     {
//       timezone: "Africa/Accra", // Ensure this matches your desired time zone
//     }
//   );
// };

import moment from "moment";

const dailyAccruedReturnJob = () => {
  cron.schedule("* * * * *", async () => {
    console.log(
      "---------------------- Calculating daily return on principal ----------------------"
    );

    try {
      let totalPrincipalReturn = 0;
      let totalAddOnReturn = 0;
      let totalAccruedReturn = 0;

      // Get all active investments in the system
      const investments = await Investment.find().populate([
        "addOns",
        "oneOffs",
      ]);
      console.log(`Found ${investments.length} active investments`);

      const currentDate = new Date();
      const firstJanuary = new Date(currentDate.getFullYear(), 0, 1);

      for (const invest of investments) {
        console.log(invest);
        const daysDiff = moment(currentDate).diff(moment(firstJanuary), "days");
        console.log(daysDiff);

        // Get quarter days
        const daysInQuarter = getQuarterDetails();
        console.log(`Days in quarter: ${daysInQuarter}`);

        // Print
        console.log(daysInQuarter);
        console.log(invest.principal);
        console.log(invest.guaranteedRate);
        console.log(daysDiff);
        console.log();
        // Calculate daily return value
        const dailyReturn = calculateDailyRate(
          invest.principal,
          invest.guaranteedRate,
          daysInQuarter
        );

        const principalTotalReturn = daysDiff * dailyReturn;
        totalPrincipalReturn = principalTotalReturn; // Accumulate total
        invest.principalAccruedReturn += principalTotalReturn;

        for (const addOn of invest.addOns) {
          // Check if the addOn has a status of active
          if (addOn.status === "active") {
            const dailyAddOnReturn = calculateDailyRate(
              addOn.amount,
              invest.guaranteedRate,
              daysInQuarter
            );
            totalAddOnReturn = daysDiff * dailyAddOnReturn;
            invest.addOnAccruedReturn += dailyAddOnReturn;
            await invest.save();
          }
        }

        console.log("----------------------------------------------");
        invest.totalAccruedReturn =
          principalTotalReturn + totalAddOnReturn + invest.performanceYield;

        // Calculations for management fees
        const managementFee =
          ((principalTotalReturn + totalAddOnReturn) *
            invest.managementFeeRate) /
          100;
        invest.managementFee = managementFee;

        console.log(invest.addOnAccruedReturn);
        console.log(invest.totalAccruedReturn);
        await invest.save();
      }
    } catch (error) {
      console.error("Error calculating daily returns:", error.message);
    }
  });
};

export default dailyAccruedReturnJob;
