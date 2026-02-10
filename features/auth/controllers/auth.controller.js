import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { promisify } from "util";
import { catchAsync } from "../../../utils/catchAsync.js";
import AppError from "../../../utils/appError.js";
import User from "../models/user.model.js";
// Temporarily disabled for debugging
// import { auditLogger, logAuditEvent } from "../../../middleware/auditLogger.js";
import PasswordValidator from "../../../utils/passwordValidator.js";

// Create password validator instance
const passwordValidator = new PasswordValidator();

/**
 * Create JWT token
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Create and send token response
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() +
        (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

/**
 * Input sanitization helper
 */
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input.trim().replace(/[<>]/g, "");
};

/**
 * User signup
 */
export const signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;

  // Required fields
  if (!name || !email || !password || !passwordConfirm) {
    return next(new AppError("All fields are required", 400));
  }

  // Basic sanitization
  const sanitizedName = name.trim();
  const sanitizedEmail = email.trim().toLowerCase();

  // Basic email check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitizedEmail)) {
    return next(new AppError("Invalid email address", 400));
  }

  // Password rules (keep it simple)
  if (password.length < 8) {
    return next(new AppError("Password must be at least 8 characters", 400));
  }

  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: sanitizedEmail });
  if (existingUser) {
    return next(new AppError("Email already registered", 400));
  }

  // Create user
  const newUser = await User.create({
    name: sanitizedName,
    email: sanitizedEmail,
    password,
    passwordConfirm,
    displayName: sanitizedName,
  });

  createSendToken(newUser, 201, res);
});

/**
 * User login
 */
export const login = catchAsync(async (req, res, next) => {
  const { identifier, password } = req.body;

  // Input validation
  if (!identifier || !password) {
    return next(new AppError("Email/username and password are required", 400));
  }

  const sanitizedIdentifier = sanitizeInput(identifier);
  const sanitizedPassword = sanitizeInput(password);

  // Find user by email or username
  const user = await User.findOne({
    $or: [
      { email: sanitizedIdentifier.toLowerCase() },
      { name: sanitizedIdentifier },
    ],
  }).select(
    "+password +failedLoginAttempts +mustChangePassword +twoFactorEnabled +passwordHistory +passwordResetToken +passwordResetExpiresIn +passwordLastChanged +passwordChangedAt",
  );

  if (!user) {
    // await logAuditEvent(null, "LOGIN_FAILED", req, false, "User not found");
    return res.status(404).json({
      status: "error",
      message: "Invalid credentials",
    });
  }

  // Check account lock status
  if (user.isLocked()) {
    // await logAuditEvent(user._id, "LOGIN_FAILED", req, false, "Account locked");
    return next(
      new AppError(
        "Account is temporarily locked due to multiple failed attempts. Please try again later.",
        423,
      ),
    );
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(sanitizedPassword);

  if (!isPasswordValid) {
    await user.incFailedLoginAttempts();
    // await logAuditEvent(
    //   user._id,
    //   "LOGIN_FAILED",
    //   req,
    //   false,
    //   "Invalid password",
    // );
    return res.status(401).json({
      status: "error",
      message: "Invalid credentials",
    });
  }

  // Reset failed attempts on successful login
  await user.resetFailedLoginAttempts();
  // await logAuditEvent(user._id, "LOGIN_SUCCESS", req, true);

  createSendToken(user, 200, res);
});

/**
 * Forgot password
 */
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide your email address", 400));
  }

  const sanitizedEmail = sanitizeInput(email).toLowerCase();

  const user = await User.findOne({ email: sanitizedEmail });

  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "No user found with that email address",
    });
  }

  try {
    // Generate secure reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL || "https://partner.lynchpinglobal.com"}/reset-password/${resetToken}`;

    // Send reset email
    const { getPasswordResetTemplate } =
      await import("../../../utils/emailTemplates.js");
    const htmlContent = getPasswordResetTemplate(
      user.name || user.displayName || "User",
      resetURL,
      resetToken,
      1, // 1 hour expiry
    );

    const { sendEmail } = await import("../../../utils/email.js");
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: htmlContent,
    });

    // await logAuditEvent(user._id, "PASSWORD_RESET_REQUESTED", req, true);

    res.status(200).json({
      status: "success",
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });

    // await logAuditEvent(
    //   user._id,
    //   "PASSWORD_RESET_FAILED",
    //   req,
    //   false,
    //   error.message,
    // );

    return next(
      new AppError(
        "There was an error sending the email. Try again later.",
        500,
      ),
    );
  }
});

/**
 * Reset password
 */
export const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  if (!password || !passwordConfirm) {
    return next(
      new AppError("Password and password confirmation are required", 400),
    );
  }

  // Validate password strength
  const passwordValidation = passwordValidator.validatePassword(password, {});
  if (!passwordValidation.isValid) {
    return next(new AppError(passwordValidation.errors.join(", "), 400));
  }

  // Check if passwords match
  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  // Hash the token and find user
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresIn: { $gt: new Date() },
  }).select("+password +passwordHistory +passwordLastChanged");

  if (!user) {
    // await logAuditEvent(null, "PASSWORD_RESET_FAILED", req, false, "Invalid or expired token");
    return next(new AppError("Token is invalid or has expired", 400));
  }

  // Check if new password is different from current password
  const isSamePassword = await user.comparePassword(password);
  if (isSamePassword) {
    return next(
      new AppError("New password must be different from current password", 400),
    );
  }

  // Update password and remove reset token fields
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpiresIn = undefined;
  user.passwordChangedAt = Date.now() - 1000;

  await user.save();

  // await logAuditEvent(user._id, "PASSWORD_RESET_SUCCESS", req, true);

  createSendToken(user, 200, res);
});

/**
 * Logout
 */
export const logout = catchAsync(async (req, res, next) => {
  try {
    // await logAuditEvent(req.user._id, "LOGOUT", req, true);

    res.cookie("jwt", "loggedout", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    await logAuditEvent(
      req.user?._id,
      "LOGOUT_FAILED",
      req,
      false,
      error.message,
    );
    return next(new AppError("Logout failed", 500));
  }
});

/**
 * Get user profile
 */
export const getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // await logAuditEvent(user._id, "PROFILE_ACCESSED", req, true);

  res.status(200).json({
    status: "success",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    },
  });
});
