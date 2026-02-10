import AuditLog from '../features/auth/models/auditLog.model.js';
import geoip from 'geoip-lite';

/**
 * Middleware to log authentication and security events
 */
export const auditLogger = (action, options = {}) => {
  return async (req, res, next) => {
    // Store original res.json to intercept responses
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log after response is sent
      setImmediate(async () => {
        try {
          await createAuditLog(req, res, action, data, options);
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Create audit log entry
 */
async function createAuditLog(req, res, action, responseData, options = {}) {
  const userId = req.user?.id || null;
  const success = res.statusCode < 400;
  const failureReason = !success ? (responseData?.message || 'Unknown error') : null;
  
  // Get IP address (considering proxy headers)
  const ipAddress = req.ip || 
    req.connection.remoteAddress || 
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    'unknown';
  
  // Get user agent
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Get location from IP
  const geo = geoip.lookup(ipAddress);
  
  // Calculate risk score based on various factors
  const riskScore = calculateRiskScore(req, {
    action,
    success,
    ipAddress,
    userAgent,
    userId,
    geo
  });
  
  const logData = {
    userId,
    action,
    ipAddress,
    userAgent,
    success,
    failureReason,
    sessionId: req.sessionID || null,
    location: geo ? {
      country: geo.country,
      city: geo.city,
      latitude: geo.ll[0],
      longitude: geo.ll[1]
    } : null,
    riskScore,
    metadata: {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime,
      ...options.metadata
    }
  };
  
  await AuditLog.createLog(logData);
  
  // Trigger security alerts for high-risk activities
  if (riskScore >= 70) {
    await triggerSecurityAlert(logData);
  }
}

/**
 * Calculate risk score based on various factors
 */
function calculateRiskScore(req, context) {
  let riskScore = 0;
  const { action, success, ipAddress, userAgent, userId, geo } = context;
  
  // Base risk by action type
  const actionRiskMap = {
    'LOGIN_FAILED': 40,
    'PASSWORD_CHANGE': 20,
    'PASSWORD_RESET': 30,
    'PASSWORD_RESET_REQUEST': 25,
    'ACCOUNT_LOCKED': 60,
    'MFA_DISABLED': 50
  };
  
  riskScore += actionRiskMap[action] || 10;
  
  // Failed actions increase risk
  if (!success) {
    riskScore += 20;
  }
  
  // Suspicious IP patterns
  if (isPrivateIP(ipAddress)) {
    riskScore += 10;
  }
  
  // Geographic anomalies (would need user history)
  if (geo && geo.country && geo.country !== 'US') { // Example: non-US access
    riskScore += 15;
  }
  
  // Unusual user agent
  if (userAgent.includes('bot') || userAgent.includes('crawler')) {
    riskScore += 30;
  }
  
  return Math.min(riskScore, 100);
}

/**
 * Check if IP is private/internal
 */
function isPrivateIP(ip) {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^localhost$/,
    /^::1$/
  ];
  
  return privateRanges.some(range => range.test(ip));
}

/**
 * Trigger security alerts for high-risk activities
 */
async function triggerSecurityAlert(logData) {
  // This would integrate with your alerting system
  console.warn('HIGH RISK ACTIVITY DETECTED:', {
    userId: logData.userId,
    action: logData.action,
    ipAddress: logData.ipAddress,
    riskScore: logData.riskScore,
    timestamp: logData.timestamp
  });
  
  // TODO: Implement actual alerting (email, Slack, SMS, etc.)
  // await sendSecurityAlert(logData);
}

/**
 * Helper middleware to add request start time
 */
export const addRequestTime = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

/**
 * Manual audit logging function for non-middleware usage
 */
export const logAuditEvent = async (userId, action, req, success = true, failureReason = null, metadata = {}) => {
  const ipAddress = req?.ip || 'unknown';
  const userAgent = req?.headers?.['user-agent'] || 'unknown';
  const geo = geoip.lookup(ipAddress);
  
  await AuditLog.createLog({
    userId,
    action,
    ipAddress,
    userAgent,
    success,
    failureReason,
    location: geo ? {
      country: geo.country,
      city: geo.city,
      latitude: geo.ll[0],
      longitude: geo.ll[1]
    } : null,
    metadata
  });
};

export default auditLogger;
