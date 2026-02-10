import crypto from "crypto";
import jwt from "jsonwebtoken";
import AppError from "../../../utils/appError.js";
import { sendEmail } from "../../../utils/email.js";
import catchAsync from "../../error/catch-async-error.js";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import PasswordValidator from "../../../utils/passwordValidator.js";
import { auditLogger, logAuditEvent } from "../../../middleware/auditLogger.js";

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createToken = async (user, statusCode, res, req = null) => {
  const token = signToken(user._id);
  const refreshToken = crypto.randomBytes(32).toString("hex");

  // Create session record
  if (req) {
    try {
      await Session.createSession({
        userId: user._id,
        token,
        refreshToken,
        deviceInfo: {
          userAgent: req.headers["user-agent"],
          ip: req.ip || req.connection.remoteAddress,
          platform: req.headers["sec-ch-ua-platform"] || "unknown",
        },
        expiresAt: new Date(
          Date.now() +
            (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000,
        ),
      });
    } catch (error) {
      console.error("Failed to create session:", error);
      // Continue without session management if it fails
    }
  }

  // Set jwt in cookies
  const cookieOption = {
    expiresIn: process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    cookieOption.secure = true;
  }

  res.cookie("jwt", token, cookieOption);
  res.cookie("refreshToken", refreshToken, {
    ...cookieOption,
    expiresIn: 30 * 24 * 60 * 60 * 1000, // 30 days for refresh token
  });

  // Remove password from output
  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    user,
    token,
    refreshToken,
  });
};
// Handle signup
export const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    displayName: req.body.displayName,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createToken(newUser, 201, res, req);
});

// Handle login
export const login = catchAsync(async (req, res, next) => {
  // Check if email and password exist
  const { identifier, password } = req.body;
  console.log("================================================ login");
  console.log("identifier", identifier);

  if (!identifier || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  const user = identifier.includes("@")
    ? await User.findOne({ email: identifier }).select("+password")
    : await User.findOne({ name: identifier }).select("+password");

  if (!user) {
    await logAuditEvent(null, "LOGIN_FAILED", req, false, "User not found");
    return res.status(404).json({ message: "User not found" });
  }

  // Check if account is locked
  if (user.isLocked()) {
    await logAuditEvent(user._id, "LOGIN_FAILED", req, false, "Account locked");
    return next(
      new AppError(
        "Account is locked due to multiple failed attempts. Please try again later.",
        423,
      ),
    );
  }

  // Check if the user exists and password correct
  console.log("user", user);

  if (!(await user.comparePassword(password))) {
    await user.incFailedLoginAttempts();
    await logAuditEvent(
      user._id,
      "LOGIN_FAILED",
      req,
      false,
      "Invalid password",
    );
    return next(new AppError("Incorrect email or password", 401));
  }

  // Reset failed attempts on successful login
  await user.resetFailedLoginAttempts();
  await logAuditEvent(user._id, "LOGIN_SUCCESS", req, true);

  // Check if password change is required
  if (user.mustChangePassword) {
    return res.status(200).json({
      status: "success",
      message: "Password change required",
      requirePasswordChange: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  }

  createToken(user, 200, res, req);
});

// Handle forgot password
export const forgotPassword = catchAsync(async (req, res, next) => {
  console.log("----------------------forgotPassword-----------------------");
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    await logAuditEvent(
      null,
      "PASSWORD_RESET_REQUEST",
      req,
      false,
      "User not found",
    );
    return next(new AppError("There is no user with email address.", 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  console.log("Before save - user has token:", !!user.passwordResetToken);
  console.log("Before save - token expires:", user.passwordResetExpiresIn);

  await user.save({ validateBeforeSave: false });

  console.log("After save - user has token:", !!user.passwordResetToken);
  console.log("After save - token expires:", user.passwordResetExpiresIn);
  console.log(resetToken);

  // 3) Create reset URL with proper domain
  const resetURL = `${process.env.FRONTEND_URL || "https://partner.lynchpinglobal.com"}/reset-password/${resetToken}`;

  // 4) Send professional email with HTML template
  try {
    const { getPasswordResetTemplate } =
      await import("../../../utils/emailTemplates.js");

    const htmlContent = getPasswordResetTemplate(
      user.name || user.displayName || "User",
      resetURL,
      resetToken,
      1, // 1 hour expiry
    );

    await sendEmail({
      to: user.email,
      subject: "🔒 Password Reset Request - Lynchpin Global",
      html: htmlContent,
      text: `Password Reset Request\n\nHi ${user.name || user.displayName || "User"},\n\nWe received a request to reset your password. Click the link below to reset it:\n\n${resetURL}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nLynchpin Global Team`,
    });

    // Log successful email send
    await logAuditEvent(user._id, "PASSWORD_RESET_REQUEST", req, true);

    res.status(200).json({
      status: "success",
      message:
        "Password reset link sent to your email! Please check your inbox.",
      // In development, return token for testing
      ...(process.env.NODE_ENV === "development" && { resetToken }),
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });

    await logAuditEvent(
      user._id,
      "PASSWORD_RESET_REQUEST",
      req,
      false,
      "Email send failed",
    );

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500,
    );
  }
});

// Reset Password Handler
export const resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on the token

  // Hash the token from URL params to compare with the stored hash
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  console.log("hashedToken", hashedToken);
  console.log("Current time:", Date.now());

  // First, let's see if any user has this token (without expiration check)
  const userWithTokenOnly = await User.findOne({
    passwordResetToken: hashedToken,
  });
  console.log(
    "User with token only:",
    userWithTokenOnly ? "Found" : "Not found",
  );

  // Now check with expiration
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresIn: { $gt: Date.now() },
  });

  console.log("user", user);
  if (user) {
    console.log("Token expires at:", user.passwordResetExpiresIn);
    console.log("Time remaining:", user.passwordResetExpiresIn - Date.now());
  } else {
    // Let's check if user exists but token is expired
    const userWithExpiredToken = await User.findOne({
      passwordResetToken: hashedToken,
    });
    if (userWithExpiredToken) {
      console.log("Found user with token but expired!");
      console.log(
        "Token expired at:",
        userWithExpiredToken.passwordResetExpiresIn,
      );
      console.log("Current time:", Date.now());
      console.log(
        "Expired by:",
        Date.now() - userWithExpiredToken.passwordResetExpiresIn,
      );
    }
  }
  if (!user) {
    await logAuditEvent(
      null,
      "PASSWORD_RESET",
      req,
      false,
      "Token expired or invalid",
    );
    next(new AppError("Token expired or invalid", 400));
  }

  // Set the new password and remove reset token fields
  console.log("resetPassword");
  console.log("req.body.password", req.body.password);
  console.log("req.body.passwordConfirm", req.body.passwordConfirm);

  // Initialize password validator
  const passwordValidator = new PasswordValidator();
  const validationResult = passwordValidator.validatePassword(
    req.body.password,
    {
      name: user.name,
      email: user.email,
      displayName: user.displayName,
    },
  );

  if (!validationResult.isValid) {
    await logAuditEvent(
      user._id,
      "PASSWORD_RESET",
      req,
      false,
      "Password validation failed",
    );
    return next(
      new AppError(
        `Password validation failed: ${validationResult.errors.join(", ")}`,
        400,
      ),
    );
  }

  // Check if password is in user's history
  const isPasswordInHistory = await user.isPasswordInHistory(req.body.password);
  if (isPasswordInHistory) {
    await logAuditEvent(
      user._id,
      "PASSWORD_RESET",
      req,
      false,
      "Password reused from history",
    );
    return next(
      new AppError(
        "You cannot reuse a previous password. Please choose a different one.",
        400,
      ),
    );
  }

  // Validate password length and confirm password
  if (
    req.body.password.length < 8 ||
    req.body.passwordConfirm !== req.body.password
  ) {
    await logAuditEvent(
      user._id,
      "PASSWORD_RESET",
      req,
      false,
      "Password requirements not met",
    );
    return next(
      new AppError(
        "Password must be at least 8 characters long and match the confirm password",
        400,
      ),
    );
  }

  // Update the password and remove reset token fields
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpiresIn = undefined;
  user.mustChangePassword = false;
  await user.save();

  // Log successful password reset
  await logAuditEvent(user._id, "PASSWORD_RESET", req, true);

  // Log the user in by sending a new JWT
  createToken(user, 200, res, req);
});

// Update current user password
export const updateUserPassword = catchAsync(async (req, res, next) => {
  // Get the current user
  const currentUser = await User.findById(req.user.id).select("+password");

  // Check if the provided password is correct
  if (
    !(await currentUser.comparePassword(
      req.body.currentPassword,
      currentUser.password,
    ))
  ) {
    await logAuditEvent(
      currentUser._id,
      "PASSWORD_CHANGE",
      req,
      false,
      "Current password incorrect",
    );
    return next(new AppError("Current password is incorrect", 401));
  }

  // Initialize password validator
  const passwordValidator = new PasswordValidator();
  const validationResult = passwordValidator.validatePassword(
    req.body.newPassword,
    {
      name: currentUser.name,
      email: currentUser.email,
      displayName: currentUser.displayName,
    },
  );

  if (!validationResult.isValid) {
    await logAuditEvent(
      currentUser._id,
      "PASSWORD_CHANGE",
      req,
      false,
      "New password validation failed",
    );
    return next(
      new AppError(
        `Password validation failed: ${validationResult.errors.join(", ")}`,
        400,
      ),
    );
  }

  // Check if new password is in user's history
  const isPasswordInHistory = await currentUser.isPasswordInHistory(
    req.body.newPassword,
  );
  if (isPasswordInHistory) {
    await logAuditEvent(
      currentUser._id,
      "PASSWORD_CHANGE",
      req,
      false,
      "New password reused from history",
    );
    return next(
      new AppError(
        "You cannot reuse a previous password. Please choose a different one.",
        400,
      ),
    );
  }

  // Update the password
  currentUser.password = req.body.newPassword;
  currentUser.passwordConfirm = req.body.newPasswordConfirm;
  currentUser.mustChangePassword = false;
  await currentUser.save();

  // Log successful password change
  await logAuditEvent(currentUser._id, "PASSWORD_CHANGE", req, true);

  // Send confirmation email
  try {
    const { getPasswordChangedTemplate } =
      await import("../../../utils/emailTemplates.js");

    const htmlContent = getPasswordChangedTemplate(
      currentUser.name || currentUser.displayName || "User",
      `${process.env.FRONTEND_URL || "https://partner.lynchpinglobal.com"}/login`,
      {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        location: "Unknown", // You can enhance this with geoip-lite
      },
    );

    await sendEmail({
      to: currentUser.email,
      subject: "✅ Password Successfully Changed - Lynchpin Global",
      html: htmlContent,
      text: `Password Changed Successfully\n\nHi ${currentUser.name || currentUser.displayName || "User"},\n\nYour password has been successfully changed. All previous sessions have been invalidated.\n\nIf you didn't make this change, please contact support immediately.\n\nLynchpin Global Team`,
    });
  } catch (emailError) {
    console.error(
      "Failed to send password change confirmation email:",
      emailError,
    );
    // Don't fail the request if email fails
  }

  // Create new token (invalidates old sessions)
  await Session.invalidateUserSessions(currentUser._id);
  createToken(currentUser, 200, res, req);
});
