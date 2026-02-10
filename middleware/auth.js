import jwt from "jsonwebtoken";
import AppError from "../utils/appError.js";
import User from "../features/auth/models/user.model.js";
import { auditLogger } from "./auditLogger.js";

/**
 * Simple JWT authentication middleware (no sessions)
 */
export const protect = async (req, res, next) => {
  try {
    // 1) Get token from header or cookie
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    // 2) Validate token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    // 4) Check if user is active
    if (!currentUser.active) {
      return next(
        new AppError("Your account has been deactivated. Please contact support.", 401)
      );
    }

    // 5) Check if user changed password after the token was issued
    if (currentUser.passwordChangedAfter(decoded.iat)) {
      return next(
        new AppError("User recently changed password! Please log in again.", 401)
      );
    }

    // 6) Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token. Please log in again.", 401));
    } else if (error.name === "TokenExpiredError") {
      return next(new AppError("Your token has expired! Please log in again.", 401));
    }
    return next(error);
  }
};
