import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      'PASSWORD_RESET_REQUEST',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'MFA_ENABLED',
      'MFA_DISABLED',
      'PROFILE_UPDATE',
      'SECURITY_SETTING_CHANGE'
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  success: {
    type: Boolean,
    required: true
  },
  failureReason: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  sessionId: {
    type: String
  },
  location: {
    country: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// Static method to create audit log entry
auditLogSchema.statics.createLog = async function(logData) {
  try {
    const log = await this.create(logData);
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = function(userId, options = {}) {
  const { limit = 50, skip = 0, action, startDate, endDate } = options;
  
  const query = { userId };
  
  if (action) {
    query.action = action;
  }
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name email');
};

// Static method to detect suspicious activity
auditLogSchema.statics.detectSuspiciousActivity = function(userId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        uniqueIPs: { $addToSet: '$ipAddress' },
        uniqueUserAgents: { $addToSet: '$userAgent' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        uniqueIPCount: { $size: '$uniqueIPs' },
        uniqueUserAgentCount: { $size: '$uniqueUserAgents' },
        _id: 0
      }
    }
  ]);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
