import jwt from "jsonwebtoken";
import AppError from "../../../utils/appError.js";
import catchAsync from "../../error/catch-async-error.js";
import User from "../models/user.model.js";

export const verifyToken = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;

  // Check if the token is in the Authorization header or cookies
  if (
    req.headers.authorization ||
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization; // Extract token from Bearer <token>
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  console.log("Token:", token);

  if (!token) {
    // Return early after next() to avoid further execution
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification of token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded); // Log the decoded token to verify its structure
  } catch (err) {
    return next(new AppError("Token is invalid or has expired", 401));
  }

  // 3) Check if user still exists
  if (!decoded || !decoded.id) {
    return next(new AppError("Invalid token structure.", 401));
  }

  const currentUser = await User.findById(decoded.id);
  console.log("Current User:", currentUser);

  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  console.log("req.user:", req.user);
  res.locals.user = currentUser; // Optional: for use in templates if needed

  next(); // Proceed to the next middleware or route handler
});

// Role-based authorization middleware
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
};
