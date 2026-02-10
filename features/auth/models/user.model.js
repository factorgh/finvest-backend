import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      unique: true,
    },
    displayName: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: function (value) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    phone: {
      type: String,
      // required: [true, "Phone number is required"],
      validate: {
        validator: function (value) {
          return /^[0-9]{10,15}$/.test(value);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    photo: String,
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    license: {
      type: String,
      unique: true,
      default: function () {
        return `CL-${Math.floor(1000000 + Math.random() * 900000)}`;
      },
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        // Use a regular function here to access `this`
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },
    passwordChangedAt: Date,
    passwordResetExpiresIn: Date,
    passwordResetToken: String,
    passwordHistory: [
      {
        hash: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    failedLoginAttempts: {
      count: {
        type: Number,
        default: 0,
      },
      lastAttempt: Date,
      lockUntil: Date,
    },
    passwordLastChanged: {
      type: Date,
      default: Date.now,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: String,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash password if it has been modified
  if (!this.isModified("password")) return next();

  // Store current password hash in history before changing
  if (!this.isNew && this.password) {
    this.passwordHistory.push({
      hash: this.password,
      createdAt: new Date(),
    });

    // Keep only last 12 passwords
    if (this.passwordHistory.length > 12) {
      this.passwordHistory = this.passwordHistory.slice(-12);
    }
  }

  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Update password last changed timestamp
  this.passwordLastChanged = new Date();

  // Delete passwordConfirm field (it's only needed for validation)
  this.passwordConfirm = undefined;
  next();
});

// Handling token change
userSchema.pre("save", async function (next) {
  // Only hash password if it has been modified
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;

  next();
});

// Compare password instance method
userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if password was changed after the JWT was issued
userSchema.methods.passwordChangedAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTime = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTime;
  }
  return false; // False means not changed
};

// create password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Check if password exists in user's history
userSchema.methods.isPasswordInHistory = async function (newPassword) {
  for (const historicalPassword of this.passwordHistory) {
    const isMatch = await bcrypt.compare(newPassword, historicalPassword.hash);
    if (isMatch) {
      return true;
    }
  }
  return false;
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return !!(
    this.failedLoginAttempts.lockUntil &&
    this.failedLoginAttempts.lockUntil > Date.now()
  );
};

// Increment failed login attempts
userSchema.methods.incFailedLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (
    this.failedLoginAttempts.lockUntil &&
    this.failedLoginAttempts.lockUntil < Date.now()
  ) {
    return this.updateOne({
      $unset: { "failedLoginAttempts.lockUntil": 1 },
      $set: {
        "failedLoginAttempts.count": 1,
        "failedLoginAttempts.lastAttempt": new Date(),
      },
    });
  }

  const updates = {
    $inc: { "failedLoginAttempts.count": 1 },
    $set: { "failedLoginAttempts.lastAttempt": new Date() },
  };

  // Lock account after 5 failed attempts for 2 hours
  if (this.failedLoginAttempts.count + 1 >= 5 && !this.isLocked()) {
    updates.$set = {
      ...updates.$set,
      "failedLoginAttempts.lockUntil": Date.now() + 2 * 60 * 60 * 1000, // 2 hours
    };
  }

  return this.updateOne(updates);
};

// Reset failed login attempts on successful login
userSchema.methods.resetFailedLoginAttempts = function () {
  return this.updateOne({
    $unset: {
      "failedLoginAttempts.count": 1,
      "failedLoginAttempts.lastAttempt": 1,
      "failedLoginAttempts.lockUntil": 1,
    },
  });
};

// Query Middleware
userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.index({ passwordResetToken: 1 });

userSchema.index({ passwordResetExpiresIn: 1 });

const User = mongoose.model("User", userSchema);

export default User;
