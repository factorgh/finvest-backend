import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from "../factory/factory-functions.js";

import RentalModel from "./rentals.model.js";

export const createRental = createOne(RentalModel);
export const deleteRental = deleteOne(RentalModel);
export const updateRental = updateOne(RentalModel);
export const getAllRentals = getAll(RentalModel);
export const getRental = getOne(RentalModel);
