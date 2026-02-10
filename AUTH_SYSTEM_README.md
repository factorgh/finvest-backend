# 🚀 Modern Authentication System

A complete, secure, and production-ready authentication system built with Node.js, Express, MongoDB, and following best practices.

## ✨ Features

### 🔐 Core Authentication
- **Secure Registration** with input validation and sanitization
- **Multi-factor Login** (email/username + password)
- **Password Reset** with secure token-based flow
- **Session Management** with JWT and refresh tokens
- **Account Lockout** after failed attempts
- **Password History** tracking to prevent reuse

### 🛡️ Security Features
- **Input Sanitization** to prevent XSS attacks
- **Password Hashing** with bcrypt (cost 12)
- **Secure Cookies** (httpOnly, secure, sameSite)
- **Rate Limiting** and account lockout
- **Audit Logging** for all authentication events
- **Password Validation** with strength requirements
- **Password History** to prevent reuse

### 📊 Monitoring & Logging
- **Comprehensive Audit Trail** for all auth events
- **Detailed Debug Logging** for troubleshooting
- **Session Tracking** with device information
- **Failed Attempt Monitoring**

## 🏗️ Architecture

### Clean Architecture Principles
```
├── controllers/          # Business logic
├── models/             # Data models and schemas
├── middleware/         # Authentication & validation
├── routes/            # API endpoints
├── utils/             # Helper functions
└── scripts/           # Database maintenance
```

### Key Components

#### 1. Authentication Controller (`auth.controller.new.js`)
- **Input Validation**: Sanitizes and validates all inputs
- **Error Handling**: Comprehensive error management
- **Security**: Implements all security best practices
- **Logging**: Detailed audit logging

#### 2. User Model (`user.model.js`)
- **Password Hashing**: Automatic bcrypt hashing
- **Password History**: Tracks previous passwords
- **Account Lockout**: Failed attempt management
- **Token Management**: Reset token handling

#### 3. Session Model (`session.model.js`)
- **JWT Sessions**: Secure token storage
- **Device Tracking**: Browser and device info
- **Session Invalidation**: Secure logout
- **Cleanup**: Automatic expired session removal

## 🚀 Getting Started

### 1. Environment Variables
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Database
MONGODB_URI=mongodb://localhost:27017/your-database

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 2. Install Dependencies
```bash
npm install bcryptjs jsonwebtoken mongoose crypto
```

### 3. Update Routes
Replace your existing auth routes with the new ones:

```javascript
// In your main routes file
import authRoutes from "./features/auth/routes/auth.routes.new.js";
app.use("/api/v1/auth", authRoutes);
```

### 4. Clean Up Existing Data
Run the cleanup script to fix corrupted password history:

```bash
# Clean up corrupted data
node scripts/cleanup-password-history.js

# Verify cleanup
node scripts/cleanup-password-history.js --verify
```

## 📡 API Endpoints

### Authentication Endpoints

#### POST `/api/v1/auth/signup`
Register a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "displayName": "John",
  "password": "securePassword123",
  "passwordConfirm": "securePassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "displayName": "John",
      "role": "user"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### POST `/api/v1/auth/login`
Authenticate user and create session.

**Request:**
```json
{
  "identifier": "john@example.com", // or "john_doe"
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "displayName": "John",
      "role": "user"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### POST `/api/v1/auth/forgot-password`
Request password reset link.

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password reset link sent to your email"
}
```

#### PATCH `/api/v1/auth/reset-password/:token`
Reset password with token.

**Request:**
```json
{
  "password": "newSecurePassword123",
  "passwordConfirm": "newSecurePassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password reset successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "new_jwt_token",
    "refreshToken": "new_refresh_token"
  }
}
```

#### POST `/api/v1/auth/logout` (Protected)
Logout user and invalidate session.

**Response:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

#### GET `/api/v1/auth/profile` (Protected)
Get current user profile.

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "displayName": "John",
      "role": "user"
    }
  }
}
```

## 🔒 Security Features

### Password Security
- **Bcrypt Hashing**: Cost 12 for optimal security
- **Password History**: Tracks last 12 passwords
- **Password Validation**: Strength requirements
- **Password Reuse Prevention**: Checks history

### Session Security
- **HTTP-Only Cookies**: Prevents XSS attacks
- **Secure Cookies**: HTTPS only in production
- **SameSite Protection**: CSRF prevention
- **Token Expiration**: Automatic session expiry

### Account Security
- **Failed Attempt Tracking**: Monitors login attempts
- **Account Lockout**: 5 attempts = 2-hour lock
- **Audit Logging**: Complete activity trail
- **Input Sanitization**: XSS prevention

## 🛠️ Maintenance

### Database Cleanup
Run cleanup scripts regularly:

```bash
# Clean expired sessions
node scripts/cleanup-sessions.js

# Clean password history
node scripts/cleanup-password-history.js

# Verify data integrity
node scripts/verify-integrity.js
```

### Monitoring
Monitor these metrics:
- Failed login attempts
- Account lockouts
- Password reset requests
- Session creation/invalidation

## 🐛 Troubleshooting

### Common Issues

#### 1. Login Fails with Correct Password
**Cause**: Corrupted password history
**Solution**: Run cleanup script
```bash
node scripts/cleanup-password-history.js
```

#### 2. Token Expired Error
**Cause**: JWT secret mismatch or clock sync
**Solution**: Check JWT_SECRET and server time

#### 3. Account Locked
**Cause**: 5+ failed login attempts
**Solution**: Wait 2 hours or manually reset

#### 4. Password Reset Not Working
**Cause**: Email configuration or token expiry
**Solution**: Check email settings and token generation

### Debug Logging
Enable debug mode to see detailed logs:
```bash
DEBUG=auth:* npm start
```

## 📝 Best Practices

### Development
- Use environment variables for secrets
- Enable debug logging in development
- Test with different user roles
- Validate all inputs

### Production
- Use HTTPS everywhere
- Set secure cookie flags
- Implement rate limiting
- Monitor audit logs
- Regular security updates

### Security
- Regular password strength updates
- Session timeout configuration
- Failed attempt monitoring
- Account lockout policies
- Security audit reviews

## 🔄 Migration from Old System

1. **Backup Database**: Always backup before migration
2. **Run Cleanup**: Clean corrupted data
3. **Update Routes**: Use new auth routes
4. **Test Thoroughly**: Verify all endpoints work
5. **Monitor**: Watch for issues after deployment

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the debug logs
3. Verify environment configuration
4. Test with clean data

---

**Built with ❤️ using modern security best practices**
