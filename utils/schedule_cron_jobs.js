import cron from "node-cron";
import Investment from "../features/investment/model/investment.model.js";
import { calculateDailyRate } from "./halper.js";
import { getQuarterDetails } from "./handle_date_range.js";


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

// Iterate over each investment
      for (const invest of investments) {
    // Check if the investment has a status of active
        const daysDiff = moment(currentDate).diff(
          moment(invest.startDate),
          "days"
        );
        console.log(daysDiff);

        // Get quarter days
        const daysInQuarter = getQuarterDetails();
        console.log(`Days in quarter: ${daysInQuarter}`);

        
        // Calculate daily return value
        const dailyReturn = calculateDailyRate(
          invest.principal,
          invest.guaranteedRate,
          daysInQuarter
        );

        console.log(`Daily return------------------------------: ${dailyReturn}`);

        const principalTotalReturn = daysDiff * dailyReturn;
        totalPrincipalReturn = principalTotalReturn;
        invest.principalAccruedReturn = principalTotalReturn;

        

        for (const addOn of invest.addOns) {
          // Check if the addOn has a status of active
          if (addOn.status === "active") {
            console.log("----------------------------------------------");
            console.log(`Add-on amount: ${addOn.amount}`);
            console.log(`Days in quarter: ${daysInQuarter}`);
            console.log(`Rate: ${invest.guaranteedRate}`);
            console.log(`----------------------------------------------`);
            const dailyAddOnReturn = calculateDailyRate(
              addOn.amount,
              invest.guaranteedRate,
              daysInQuarter
            );

            const addOnDays = moment(currentDate).diff(
              moment(addOn.startDate),
              "days"
            );
            console.log(`Add-on start date: ${addOn.startDate}`);
            console.log(`AddonReturn: ${dailyAddOnReturn} `)

            console.log(`Add-on days: ${addOnDays}`);
            totalAddOnReturn = addOnDays * dailyAddOnReturn;
            addOn.accruedAddOnInterest = totalAddOnReturn;
            console.log
            await invest.save();
          }
        }


        // cALUCLATE THE TOTAL SUM OF ALL THE ADDON ACCRUED RETURN
         totalAddOnReturn = invest.addOns.reduce(
          (sum, currentValue) => sum + (currentValue.accruedAddOnInterest || 0),
          0
        );
        
        // update the investement addon interest
        invest.addOnAccruedReturn = totalAddOnReturn;
        
        console.log(`Total add-on return: ${totalAddOnReturn}`);

        console.log("----------------------------------------------");
        invest.totalAccruedReturn =
          principalTotalReturn + totalAddOnReturn + invest.performanceYield;

        // Calculations for management fees
        const managementFee =
          ((principalTotalReturn + totalAddOnReturn) *
            invest.managementFeeRate) /
          100;
        invest.managementFee = managementFee;
        await invest.save();
      }
    } catch (error) {
      console.error("Error calculating daily returns:", error.message);
    }
  });
};

export default dailyAccruedReturnJob;
