/**
 * Enterprise Email Templates for Password Management
 */

export const getPasswordResetTemplate = (
  userName,
  resetUrl,
  resetToken,
  expiryHours = 1,
) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Lynchpin Global</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .title {
            color: #e74c3c;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #3498db;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .button:hover {
            background-color: #2980b9;
        }
        .security-info {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }
        .token-info {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
        }
        .warning {
            color: #e74c3c;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Lynchpin Global</div>
            <h1 class="title">Password Reset Request</h1>
        </div>

        <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            
            <p>We received a request to reset your password for your Lynchpin Global account. If you didn't make this request, you can safely ignore this email.</p>

            <p>To reset your password, click the button below:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>

            <p><strong>Or copy and paste this link into your browser:</strong></p>
            <div class="token-info">${resetUrl}</div>

            <div class="security-info">
                <h3>🔒 Security Information:</h3>
                <ul>
                    <li><strong>Reset Token:</strong> ${resetToken}</li>
                    <li><strong>Expires in:</strong> ${expiryHours} hour(s)</li>
                    <li><strong>IP Address:</strong> Logged for security purposes</li>
                </ul>
            </div>

            <p class="warning">⚠️ <strong>Important:</strong> This link will expire in ${expiryHours} hour(s) for your security. After that, you'll need to request a new password reset.</p>

            <p>If you didn't request this password reset, please contact our support team immediately at <a href="mailto:support@lynchpinglobal.com">support@lynchpinglobal.com</a>.</p>
        </div>

        <div class="footer">
            <p>This is an automated message from Lynchpin Global. Please do not reply to this email.</p>
            <p>© 2024 Lynchpin Global. All rights reserved.</p>
            <p>For security reasons, never share your password or reset token with anyone.</p>
        </div>
    </div>
</body>
</html>
`;

export const getPasswordChangedTemplate = (
  userName,
  loginUrl,
  deviceInfo = {},
) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed - Lynchpin Global</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .title {
            color: #27ae60;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #27ae60;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .button:hover {
            background-color: #229954;
        }
        .security-info {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }
        .device-info {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Lynchpin Global</div>
            <h1 class="title">Password Successfully Changed</h1>
        </div>

        <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            
            <p>Your password for your Lynchpin Global account has been successfully changed.</p>

            <div class="security-info">
                <h3>✅ Security Update Confirmed</h3>
                <p>Your account security has been updated. All previous sessions have been invalidated for your protection.</p>
            </div>

            ${
              deviceInfo.ip
                ? `
            <div class="device-info">
                <h4>📍 Change Details:</h4>
                <ul>
                    <li><strong>IP Address:</strong> ${deviceInfo.ip}</li>
                    ${deviceInfo.userAgent ? `<li><strong>Device:</strong> ${deviceInfo.userAgent}</li>` : ""}
                    ${deviceInfo.location ? `<li><strong>Location:</strong> ${deviceInfo.location}</li>` : ""}
                    <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
            </div>
            `
                : ""
            }

            <p>You can now log in with your new password:</p>
            
            <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Log In to Your Account</a>
            </div>

            <p><strong>If you didn't make this change:</strong></p>
            <ul>
                <li>Contact our support team immediately</li>
                <li>Check your account for any unauthorized activity</li>
                <li>Consider enabling two-factor authentication</li>
            </ul>
        </div>

        <div class="footer">
            <p>This is an automated message from Lynchpin Global. Please do not reply to this email.</p>
            <p>© 2024 Lynchpin Global. All rights reserved.</p>
            <p>For security reasons, never share your password with anyone.</p>
        </div>
    </div>
</body>
</html>
`;

export const getAccountLockedTemplate = (userName, unlockTime, loginUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Locked - Lynchpin Global</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .title {
            color: #e74c3c;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
        }
        .alert {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .info {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Lynchpin Global</div>
            <h1 class="title">Account Temporarily Locked</h1>
        </div>

        <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            
            <div class="alert">
                <h3>🚨 Security Alert</h3>
                <p>Your account has been temporarily locked due to multiple failed login attempts. This is a security measure to protect your account from unauthorized access.</p>
            </div>

            <div class="info">
                <h3>📋 What Happened:</h3>
                <ul>
                    <li>Multiple incorrect password attempts were detected</li>
                    <li>Your account has been locked for security</li>
                    <li>The lock will automatically expire at: <strong>${unlockTime}</strong></li>
                </ul>
            </div>

            <h3>🔐 What You Can Do:</h3>
            <ol>
                <li><strong>Wait for the lock to expire</strong> - You can try logging in again after ${unlockTime}</li>
                <li><strong>Reset your password</strong> - Use the "Forgot Password" link on the login page</li>
                <li><strong>Contact support</strong> - If you believe this is an error, reach out to our team</li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Go to Login Page
                </a>
            </div>

            <p><strong>If this wasn't you:</strong></p>
            <ul>
                <li>Someone may be trying to access your account</li>
                <li>Your password may have been compromised</li>
                <li>We recommend resetting your password immediately</li>
            </ul>
        </div>

        <div class="footer">
            <p>This is an automated message from Lynchpin Global. Please do not reply to this email.</p>
            <p>© 2024 Lynchpin Global. All rights reserved.</p>
            <p>For security reasons, never share your password with anyone.</p>
        </div>
    </div>
</body>
</html>
`;

export const getSuspiciousActivityTemplate = (
  userName,
  activityDetails,
  loginUrl,
) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Suspicious Activity Detected - Lynchpin Global</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .title {
            color: #e67e22;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .danger {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .activity-details {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }
        .button {
            display: inline-block;
            background-color: #e74c3c;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .button:hover {
            background-color: #c0392b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Lynchpin Global</div>
            <h1 class="title">Suspicious Activity Detected</h1>
        </div>

        <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            
            <div class="warning">
                <h3>⚠️ Security Alert</h3>
                <p>We've detected suspicious activity on your Finance Platform account that may indicate unauthorized access attempts.</p>
            </div>

            <div class="activity-details">
                <h3>📊 Activity Details:</h3>
                <ul>
                    ${activityDetails.map((detail) => `<li><strong>${detail.label}:</strong> ${detail.value}</li>`).join("")}
                </ul>
            </div>

            <div class="danger">
                <h3>🚨 Immediate Action Required</h3>
                <p>If you don't recognize this activity, your account security may be at risk.</p>
            </div>

            <h3>🔒 Recommended Actions:</h3>
            <ol>
                <li><strong>Change your password immediately</strong></li>
                <li><strong>Review your account activity</strong></li>
                <li><strong>Enable two-factor authentication</strong></li>
                <li><strong>Log out from all devices</strong></li>
            </ol>

            <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Secure Your Account Now</a>
            </div>

            <p><strong>If this was you:</strong></p>
            <p>You can safely ignore this email. However, we recommend reviewing your account security settings.</p>

            <p><strong>If this wasn't you:</strong></p>
            <ul>
                <li>Click the button above to secure your account immediately</li>
                <li>Contact our support team if you need assistance</li>
                <li>Monitor your account for any unauthorized transactions</li>
            </ul>
        </div>

        <div class="footer">
            <p>This is an automated message from Lynchpin Global. Please do not reply to this email.</p>
            <p>© 2024 Lynchpin Global. All rights reserved.</p>
            <p>For security reasons, never share your password with anyone.</p>
        </div>
    </div>
</body>
</html>
`;
