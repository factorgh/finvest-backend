import AppError from "../../../utils/appError.js";
import catchAsync from "../../error/catch-async-error.js";
import User from "../models/user.model.js";

const filteredObj = (obj, ...allowedFields) => {
  let newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

export const updateMe = catchAsync(async (req, res, next) => {
  //  Create an error if user tries to update password

  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("This route is not for password updates", 400));
  }

  // Filter object to limit updating fields
  const filteredBody = filteredObj(req.body, "name", "email");

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: "succes",
    updatedUser,
  });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getAll = catchAsync(async (req, res, next) => {
  const allUsers = await User.find({ role: "user" });
  console.log("allUsers", allUsers);
  res.status(200).json({
    status: "success",
    allUsers,
  });
});
export const getAllAdmin = catchAsync(async (req, res, next) => {
  const users = await User.find({ role: "admin" });

  res.status(200).json({
    status: "success",
    users,
  });
});

export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  res.status(200).json({
    status: "success",
    user,
  });
});

// Delete a user
export const deleteUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Update a user
export const updateUser = catchAsync(async (req, res, next) => {
  // const filteredBody = filteredObj(req.body, "name", "email", "role");
  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: "success",
    updatedUser,
  });
});

// export const getMe = (req, res, next) => {
//   req.params.id = req.user.id;
//   next();
// };
