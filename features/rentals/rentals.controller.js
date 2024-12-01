import catchAsync from "../error/catch-async-error.js";
import {
  createOne,
  deleteOne,
  getOne,
  updateOne,
} from "../factory/factory-functions.js";

import RentalModel from "./rentals.model.js";

export const createRental = createOne(RentalModel);
export const deleteRental = deleteOne(RentalModel);
export const updateRental = updateOne(RentalModel);
//
export const getAllRentals = catchAsync(async (req, res, next) => {
  const rentals = await RentalModel.find().populate("user");
  res.status(200).json({
    status: "success",
    data: {
      data: rentals,
    },
  });
});
export const getRental = getOne(RentalModel);
