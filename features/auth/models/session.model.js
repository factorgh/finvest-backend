import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    platform: String,
    browser: String,
    os: String,
    location: {
      country: String,
      city: String,
      latitude: Number,
      longitude: Number
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ token: 1 });
sessionSchema.index({ expiresAt: 1 });
sessionSchema.index({ lastActivity: -1 });

// Static method to create new session
sessionSchema.statics.createSession = async function(sessionData) {
  const session = await this.create(sessionData);
  return session;
};

// Static method to invalidate all user sessions
sessionSchema.statics.invalidateUserSessions = async function(userId, excludeToken = null) {
  const query = { 
    userId, 
    isActive: true 
  };
  
  if (excludeToken) {
    query.token = { $ne: excludeToken };
  }
  
  const result = await this.updateMany(
    query,
    { 
      isActive: false,
      lastActivity: new Date()
    }
  );
  
  return result.modifiedCount;
};

// Static method to validate session
sessionSchema.statics.validateSession = async function(token) {
  const session = await this.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'name email active');

  if (!session) {
    return null;
  }

  // Update last activity
  await this.updateOne(
    { _id: session._id },
    { lastActivity: new Date() }
  );

  return session;
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpiredSessions = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false, lastActivity: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 days ago
    ]
  });
  
  return result.deletedCount;
};

// Static method to get active sessions for user
sessionSchema.statics.getUserSessions = async function(userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
  .sort({ lastActivity: -1 })
  .select('-token -refreshToken'); // Exclude sensitive tokens
};

// Instance method to revoke session
sessionSchema.methods.revoke = async function() {
  this.isActive = false;
  this.lastActivity = new Date();
  return this.save();
};

const Session = mongoose.model('Session', sessionSchema);

export default Session;
