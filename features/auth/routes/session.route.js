import express from "express";
import {
  logoutUser,
  logoutAllDevicesUser,
  getUserSessions,
  revokeUserSession,
  refreshAccessToken,
  getSessionAnalytics,
  forcePasswordChange
} from "../controllers/session.controller.js";
import { sessionAuth, restrictTo } from "../../../middleware/sessionAuth.js";
import { auditLogger } from "../../../middleware/auditLogger.js";

const router = express.Router();

// Public routes
router.post("/refresh", refreshAccessToken);

// Protected routes (require authentication)
router.use(sessionAuth); // Apply auth middleware to all routes below

// Session management routes
router.post("/logout", auditLogger('LOGOUT'), logoutUser);
router.post("/logout-all", auditLogger('LOGOUT_ALL_DEVICES'), logoutAllDevicesUser);
router.get("/active", getUserSessions);
router.delete("/:sessionId", auditLogger('SESSION_REVOKED'), revokeUserSession);

// Admin only routes
router.get("/analytics", restrictTo('admin', 'superadmin'), getSessionAnalytics);
router.post("/force-password-change/:userId", 
  restrictTo('admin', 'superadmin'), 
  auditLogger('PASSWORD_CHANGE_FORCED'),
  forcePasswordChange
);

export default router;
