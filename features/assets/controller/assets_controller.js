import catchAsync from "../../error/catch-async-error.js";
import {
  deleteOne,
  getOne,
  updateOne,
} from "../../factory/factory-functions.js";

import AssetsModel from "../model/assets_model.js";

// export const createAsset = createOne(AssetsModel);

export const createAsset = catchAsync(async (req, res, next) => {
  // Extract the fields from the request body excluding accruedInterest and managementFee
  const { accruedInterest, managementFee, ...otherFields } = req.body;
  const deduction = accruedInterest - managementFee;

  const doc = new AssetsModel({
    ...otherFields,
    accruedInterest,
    managementFee,
    deduction,
  });

  await doc.save();

  res.status(201).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

export const deleteAsset = deleteOne(AssetsModel);
export const updateAsset = updateOne(AssetsModel);
export const getAllAssets = catchAsync(async (req, res, next) => {
  const doc = await AssetsModel.find().populate("user");
  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

export const getAsset = getOne(AssetsModel);

export const getAssetByUser = catchAsync(async (req, res, next) => {
  // Ensure that req.user exists
  if (!req.user) {
    return next(new AppError("User not found. Please log in.", 401)); // Return an error if req.user is not found
  }

  console.log(req.user); // Log the user object to see if it's set correctly
  console.log("getAssetByUser", req.user._id);

  const assets = await AssetsModel.find({ user: req.user._id });
  res.status(200).json({
    status: "success",
    data: {
      data: assets,
    },
  });
});
