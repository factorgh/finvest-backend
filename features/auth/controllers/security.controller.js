import catchAsync from "../../error/catch-async-error.js";
import User from "../models/user.model.js";
import { logAuditEvent } from "../../../middleware/auditLogger.js";
import { sendEmail } from "../../../utils/email.js";
import {
  getAccountLockedTemplate,
  getSuspiciousActivityTemplate,
} from "../../../utils/emailTemplates.js";
import geoip from "geoip-lite";

// Send account lockout notification
export const sendAccountLockoutEmail = catchAsync(async (req, res, next) => {
  const { userId, lockUntil } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  try {
    const htmlContent = getAccountLockedTemplate(
      user.name || user.displayName || "User",
      new Date(lockUntil).toLocaleString(),
      `${process.env.FRONTEND_URL || "https://partner.lynchpinglobal.com"}/login`,
    );

    await sendEmail({
      to: user.email,
      subject: "🚨 Account Temporarily Locked - Lynchpin Global",
      html: htmlContent,
      text: `Account Locked\n\nHi ${user.name || user.displayName || "User"},\n\nYour account has been locked due to multiple failed login attempts.\n\nLock expires: ${new Date(lockUntil).toLocaleString()}\n\nLynchpin Global Team`,
    });

    await logAuditEvent(user._id, "ACCOUNT_LOCKED", req, true);

    res.status(200).json({
      status: "success",
      message: "Account lockout notification sent",
    });
  } catch (error) {
    return next(new AppError("Failed to send lockout notification", 500));
  }
});

// Send suspicious activity alert
export const sendSuspiciousActivityAlert = catchAsync(
  async (req, res, next) => {
    const { userId, activityDetails } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    try {
      // Get location from IP
      const ip = req.ip || req.connection.remoteAddress;
      const geo = geoip.lookup(ip);

      const enhancedActivityDetails = [
        ...activityDetails,
        { label: "IP Address", value: ip },
        {
          label: "Location",
          value: geo ? `${geo.city}, ${geo.country}` : "Unknown",
        },
        { label: "Time", value: new Date().toLocaleString() },
      ];

      const htmlContent = getSuspiciousActivityTemplate(
        user.name || user.displayName || "User",
        enhancedActivityDetails,
        `${process.env.FRONTEND_URL || "https://partner.lynchpinglobal.com"}/login`,
      );

      await sendEmail({
        to: user.email,
        subject: "⚠️ Suspicious Activity Detected - Lynchpin Global",
        html: htmlContent,
        text: `Suspicious Activity Detected\n\nHi ${user.name || user.displayName || "User"},\n\nWe detected suspicious activity on your account.\n\nPlease review your account security immediately.\n\nLynchpin Global Team`,
      });

      await logAuditEvent(user._id, "SUSPICIOUS_ACTIVITY_ALERT", req, true);

      res.status(200).json({
        status: "success",
        message: "Suspicious activity alert sent",
      });
    } catch (error) {
      return next(
        new AppError("Failed to send suspicious activity alert", 500),
      );
    }
  },
);

// Get user security status
export const getUserSecurityStatus = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select(
    "+passwordHistory +failedLoginAttempts +twoFactorEnabled +mustChangePassword +passwordLastChanged",
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Calculate security score
  let securityScore = 0;
  const securityFactors = [];

  // Password age factor
  const passwordAge = Date.now() - user.passwordLastChanged;
  const passwordAgeDays = passwordAge / (1000 * 60 * 60 * 24);

  if (passwordAgeDays < 30) {
    securityScore += 25;
    securityFactors.push({ factor: "Password Age", status: "Good", score: 25 });
  } else if (passwordAgeDays < 90) {
    securityScore += 15;
    securityFactors.push({ factor: "Password Age", status: "Fair", score: 15 });
  } else {
    securityScore += 5;
    securityFactors.push({ factor: "Password Age", status: "Poor", score: 5 });
  }

  // Password history factor
  if (user.passwordHistory && user.passwordHistory.length >= 8) {
    securityScore += 20;
    securityFactors.push({
      factor: "Password History",
      status: "Good",
      score: 20,
    });
  } else {
    securityScore += 10;
    securityFactors.push({
      factor: "Password History",
      status: "Fair",
      score: 10,
    });
  }

  // Two-factor authentication
  if (user.twoFactorEnabled) {
    securityScore += 30;
    securityFactors.push({
      factor: "Two-Factor Authentication",
      status: "Enabled",
      score: 30,
    });
  } else {
    securityFactors.push({
      factor: "Two-Factor Authentication",
      status: "Disabled",
      score: 0,
    });
  }

  // Recent failed attempts
  if (user.failedLoginAttempts.count === 0) {
    securityScore += 15;
    securityFactors.push({
      factor: "Recent Failed Attempts",
      status: "None",
      score: 15,
    });
  } else if (user.failedLoginAttempts.count < 3) {
    securityScore += 10;
    securityFactors.push({
      factor: "Recent Failed Attempts",
      status: "Few",
      score: 10,
    });
  } else {
    securityScore += 0;
    securityFactors.push({
      factor: "Recent Failed Attempts",
      status: "Many",
      score: 0,
    });
  }

  // Password change requirement
  if (!user.mustChangePassword) {
    securityScore += 10;
    securityFactors.push({
      factor: "Password Status",
      status: "Current",
      score: 10,
    });
  } else {
    securityFactors.push({
      factor: "Password Status",
      status: "Change Required",
      score: 0,
    });
  }

  const securityLevel =
    securityScore >= 80
      ? "Excellent"
      : securityScore >= 60
        ? "Good"
        : securityScore >= 40
          ? "Fair"
          : "Poor";

  res.status(200).json({
    status: "success",
    data: {
      securityScore,
      securityLevel,
      securityFactors,
      details: {
        passwordLastChanged: user.passwordLastChanged,
        passwordAgeDays: Math.floor(passwordAgeDays),
        passwordHistoryCount: user.passwordHistory?.length || 0,
        failedLoginAttempts: user.failedLoginAttempts.count,
        isLocked: user.isLocked(),
        lockUntil: user.failedLoginAttempts.lockUntil,
        twoFactorEnabled: user.twoFactorEnabled,
        mustChangePassword: user.mustChangePassword,
      },
    },
  });
});

// Enable two-factor authentication
export const enableTwoFactor = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { secret } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.twoFactorEnabled = true;
  user.twoFactorSecret = secret;
  await user.save();

  await logAuditEvent(user._id, "MFA_ENABLED", req, true);

  res.status(200).json({
    status: "success",
    message: "Two-factor authentication enabled successfully",
  });
});

// Disable two-factor authentication
export const disableTwoFactor = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save();

  await logAuditEvent(user._id, "MFA_DISABLED", req, true);

  res.status(200).json({
    status: "success",
    message: "Two-factor authentication disabled successfully",
  });
});
