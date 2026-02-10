import jwt from "jsonwebtoken";
import AppError from "../utils/appError.js";
import Session from "../features/auth/models/session.model.js";
import User from "../features/auth/models/user.model.js";
import { auditLogger } from "./auditLogger.js";

/**
 * Middleware to authenticate using JWT and session management
 */
export const sessionAuth = catchAsync(async (req, res, next) => {
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

  try {
    // 2) Validate token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if session exists and is valid
    const session = await Session.validateSession(token);
    if (!session) {
      return next(
        new AppError("Session expired or invalid. Please log in again.", 401)
      );
    }

    // 4) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    // 5) Check if user is active
    if (!currentUser.active) {
      return next(
        new AppError("Your account has been deactivated. Please contact support.", 401)
      );
    }

    // 6) Check if user changed password after the token was issued
    if (currentUser.passwordChangedAfter(decoded.iat)) {
      return next(
        new AppError("User recently changed password! Please log in again.", 401)
      );
    }

    // 7) Check if password change is required
    if (currentUser.mustChangePassword && !req.path.includes('/change-password')) {
      return res.status(403).json({
        status: "error",
        message: "Password change required",
        requirePasswordChange: true
      });
    }

    // 8) Grant access to protected route
    req.user = currentUser;
    req.session = session;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError("Invalid token. Please log in again.", 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError("Your token has expired! Please log in again.", 401));
    } else {
      return next(error);
    }
  }
});

/**
 * Middleware to check if user has required role
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

/**
 * Middleware to check if user owns the resource or is admin
 */
export const restrictToOwnerOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }
    
    if (req.user._id.toString() !== resourceUserId) {
      return next(
        new AppError("You can only access your own resources", 403)
      );
    }
    
    next();
  };
};

/**
 * Middleware to refresh token
 */
export const refreshToken = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return next(new AppError("No refresh token provided", 401));
  }

  try {
    // Find session with refresh token
    const session = await Session.findOne({
      refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return next(new AppError("Invalid refresh token", 401));
    }

    // Generate new tokens
    const newToken = jwt.sign({ id: session.userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    const newRefreshToken = crypto.randomBytes(32).toString('hex');

    // Update session
    session.token = newToken;
    session.refreshToken = newRefreshToken;
    session.lastActivity = new Date();
    await session.save();

    // Set new cookies
    const cookieOption = {
      expiresIn: process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
      httpOnly: true,
    };

    if (process.env.NODE_ENV === "production") {
      cookieOption.secure = true;
    }

    res.cookie("jwt", newToken, cookieOption);
    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOption,
      expiresIn: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      status: "success",
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    return next(new AppError("Failed to refresh token", 401));
  }
});

/**
 * Middleware to logout user (revoke session)
 */
export const logout = catchAsync(async (req, res, next) => {
  const token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];
  
  if (token) {
    await Session.updateOne(
      { token },
      { 
        isActive: false,
        lastActivity: new Date()
      }
    );
  }

  // Clear cookies
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.cookie("refreshToken", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ 
    status: "success",
    message: "Logged out successfully" 
  });
});

/**
 * Middleware to logout from all devices
 */
export const logoutAllDevices = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  
  // Invalidate all sessions for this user
  const invalidatedCount = await Session.invalidateUserSessions(userId);
  
  // Clear cookies
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.cookie("refreshToken", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ 
    status: "success",
    message: `Logged out from ${invalidatedCount + 1} devices successfully` 
  });
});

/**
 * Middleware to get active sessions for current user
 */
export const getActiveSessions = catchAsync(async (req, res, next) => {
  const sessions = await Session.getUserSessions(req.user._id);
  
  res.status(200).json({
    status: "success",
    results: sessions.length,
    data: {
      sessions
    }
  });
});

/**
 * Middleware to revoke a specific session
 */
export const revokeSession = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  
  const session = await Session.findOne({
    _id: sessionId,
    userId: req.user._id,
    isActive: true
  });

  if (!session) {
    return next(new AppError("Session not found", 404));
  }

  await session.revoke();

  res.status(200).json({
    status: "success",
    message: "Session revoked successfully"
  });
});

// Helper function for catchAsync
function catchAsync(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export default sessionAuth;
