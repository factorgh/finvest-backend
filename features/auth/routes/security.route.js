import express from "express";
import {
  sendAccountLockoutEmail,
  sendSuspiciousActivityAlert,
  getUserSecurityStatus,
  enableTwoFactor,
  disableTwoFactor
} from "../controllers/security.controller.js";
import { sessionAuth, restrictTo } from "../../../middleware/sessionAuth.js";
import { auditLogger } from "../../../middleware/auditLogger.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(sessionAuth);

// User security routes
router.get("/status", getUserSecurityStatus);
router.post("/mfa/enable", auditLogger('MFA_ENABLED'), enableTwoFactor);
router.post("/mfa/disable", auditLogger('MFA_DISABLED'), disableTwoFactor);

// Admin only security routes
router.post("/notify/lockout", 
  restrictTo('admin', 'superadmin'), 
  auditLogger('ACCOUNT_LOCKED'),
  sendAccountLockoutEmail
);

router.post("/notify/suspicious", 
  restrictTo('admin', 'superadmin'), 
  auditLogger('SUSPICIOUS_ACTIVITY_ALERT'),
  sendSuspiciousActivityAlert
);

export default router;
