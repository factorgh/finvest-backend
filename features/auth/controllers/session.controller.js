import catchAsync from "../../error/catch-async-error.js";
import { 
  logout, 
  logoutAllDevices, 
  getActiveSessions, 
  revokeSession,
  refreshToken 
} from "../../../middleware/sessionAuth.js";
import { logAuditEvent } from "../../../middleware/auditLogger.js";

// Logout current session
export const logoutUser = logout;

// Logout from all devices
export const logoutAllDevicesUser = logoutAllDevices;

// Get all active sessions for current user
export const getUserSessions = getActiveSessions;

// Revoke a specific session
export const revokeUserSession = revokeSession;

// Refresh access token
export const refreshAccessToken = refreshToken;

// Get session analytics (admin only)
export const getSessionAnalytics = catchAsync(async (req, res, next) => {
  const Session = require("../models/session.model.js").default;
  
  const totalSessions = await Session.countDocuments({ isActive: true });
  const activeUsers = await Session.distinct('userId', { isActive: true });
  
  const deviceBreakdown = await Session.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$deviceInfo.platform', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const recentActivity = await Session.find({ isActive: true })
    .sort({ lastActivity: -1 })
    .limit(10)
    .populate('userId', 'name email')
    .select('-token -refreshToken');

  res.status(200).json({
    status: "success",
    data: {
      totalSessions,
      activeUsers: activeUsers.length,
      deviceBreakdown,
      recentActivity
    }
  });
});

// Force password change for user (admin only)
export const forcePasswordChange = catchAsync(async (req, res, next) => {
  const User = require("../models/user.model.js").default;
  const { userId } = req.params;
  const { reason } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { 
      mustChangePassword: true,
      $push: {
        passwordHistory: {
          hash: user.password,
          createdAt: new Date()
        }
      }
    },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Invalidate all user sessions
  const Session = require("../models/session.model.js").default;
  await Session.invalidateUserSessions(userId);

  // Log the action
  await logAuditEvent(
    userId, 
    'PASSWORD_CHANGE_FORCED', 
    req, 
    true, 
    null, 
    { reason, forcedBy: req.user._id }
  );

  res.status(200).json({
    status: "success",
    message: "Password change forced successfully. User will be required to change password on next login.",
    data: {
      userId: user._id,
      email: user.email,
      mustChangePassword: true
    }
  });
});
