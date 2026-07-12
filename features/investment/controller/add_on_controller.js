import { AddOn } from "../model/add_on.model.js";
import Investment from "../model/investment.model.js";
import { recalculateInvestment } from "../../../utils/recalculate.js";

export const addAddOnToInvestment = async (req, res, next) => {
  const { amount, investmentId, status } = req.body;

  try {
    const investment = await Investment.findById(investmentId);
    if (!investment) {
      return res
        .status(404)
        .json({ status: "fail", message: "Investment not found" });
    }

    const newAddOn = {
      amount,
      rate: investment.guaranteedRate,
      dateOfEntry: Date.now(),
      startDate: new Date(),
      status,
    };
    // Create addon
    const savedAddOn = await AddOn.create(newAddOn);

    console.log("------------------New Add on-----------", newAddOn);
    investment.addOns.push(savedAddOn._id);
    investment.lastModified = new Date();

    await investment.save();

    await recalculateInvestment(investmentId);

    res.status(200).json({ status: "success", data: investment });
  } catch (error) {
    next(error);
  }
};

// Update add on Status
export const updateAddOnStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status,startDate } = req.body;
  try {
    const addOn = await AddOn.findById(id);
    if (!addOn) {
      return res
        .status(404)
        .json({ status: "fail", message: "Add on not found" });
    }
    addOn.status = status;
    addOn.startDate = startDate;
    await addOn.save();

    const investment = await Investment.findOne({ addOns: id });
    if (investment) {
      await recalculateInvestment(investment._id);
    }

    res.status(200).json({ status: "success", data: addOn });
  } catch (error) {
    next(error);
  }
};

// Delete add on
export const deleteAddOn = async (req, res, next) => {
  const { id } = req.params;
  try {
    const addOn = await AddOn.findById(id);
    if (!addOn) {
      return res
        .status(404)
        .json({ status: "fail", message: "Add on not found" });
    }

    // Find all investments referencing this addon and populate their addons to calculate updated totals
    const investments = await Investment.find({ addOns: id }).populate("addOns");

    for (const investment of investments) {
      // Filter out the deleted addon from remaining list
      const remainingAddOns = (investment.addOns || []).filter(
        (addon) => String(addon._id) !== String(id)
      );

      // Sum accrued interest of remaining active addons
      let totalAddOnReturn = 0;
      for (const remainingAddOn of remainingAddOns) {
        if (remainingAddOn.status === "active") {
          totalAddOnReturn += remainingAddOn.accruedAddOnInterest || remainingAddOn.accruedInterest || 0;
        }
      }

      // Update investment's list and accumulated addon return
      investment.addOns = investment.addOns.filter(
        (addonId) => String(addonId._id || addonId) !== String(id)
      );
      investment.addOnAccruedReturn = totalAddOnReturn;

      // Recalculate other financial metrics (management fee, total accrued return)
      const principalReturn = investment.principalAccruedReturn || 0;
      const grossReturn = principalReturn + totalAddOnReturn;
      const managementFee = (grossReturn * (investment.managementFeeRate || 0)) / 100;
      investment.managementFee = managementFee;

      investment.totalAccruedReturn =
        grossReturn +
        (investment.performanceYield || 0) -
        (managementFee + (investment.operationalCost || 0));

      investment.lastModified = new Date();
      await investment.save();
      await recalculateInvestment(investment._id);
    }

    // Delete the addon document
    await AddOn.findByIdAndDelete(id);

    res.status(204).json({ status: "success", data: null });
  } catch (error) {
    next(error);
  }
};
