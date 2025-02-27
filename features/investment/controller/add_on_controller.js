import { AddOn } from "../model/add_on.model.js";
import Investment from "../model/investment.model.js";

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
    res.status(200).json({ status: "success", data: addOn });
  } catch (error) {
    next(error);
  }
};
