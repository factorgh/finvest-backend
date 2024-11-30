import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from "../../factory/factory-functions.js";

import AssetsModel from "../model/assets_model.js";

export const createAsset = createOne(AssetsModel);
export const deleteAsset = deleteOne(AssetsModel);
export const updateAsset = updateOne(AssetsModel);
export const getAllAssets = getAll(AssetsModel);
export const getAsset = getOne(AssetsModel);
