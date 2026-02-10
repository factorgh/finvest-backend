import zxcvbn from 'zxcvbn';

/**
 * Enterprise-grade password validation utility
 */
export class PasswordValidator {
  constructor(options = {}) {
    this.options = {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventCommonPasswords: true,
      preventUserInfo: true,
      maxAge: 90, // days
      historyCount: 12, // remember last 12 passwords
      minComplexityScore: 3, // out of 4
      ...options
    };
    
    // Common passwords to reject
    this.commonPasswords = new Set([
      'password', '123456', '123456789', 'qwerty', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890',
      'password1', '123123', 'qwerty123', 'password!', 'admin123'
    ]);
  }

  /**
   * Validate password strength and requirements
   */
  validatePassword(password, userInfo = {}) {
    const errors = [];
    const warnings = [];

    // Basic length check
    if (password.length < this.options.minLength) {
      errors.push(`Password must be at least ${this.options.minLength} characters long`);
    }

    // Character requirements
    if (this.options.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.options.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.options.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.options.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Common password check
    if (this.options.preventCommonPasswords && this.commonPasswords.has(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }

    // User information check
    if (this.options.preventUserInfo) {
      const { name, email, displayName } = userInfo;
      const lowerPassword = password.toLowerCase();
      
      if (name && lowerPassword.includes(name.toLowerCase())) {
        errors.push('Password cannot contain your name');
      }
      
      if (displayName && lowerPassword.includes(displayName.toLowerCase())) {
        errors.push('Password cannot contain your display name');
      }
      
      if (email) {
        const emailParts = email.split('@')[0].toLowerCase();
        if (lowerPassword.includes(emailParts)) {
          errors.push('Password cannot contain your email username');
        }
      }
    }

    // Complexity score using zxcvbn
    const complexityResult = zxcvbn(password, Object.values(userInfo).filter(Boolean));
    const complexityScore = complexityResult.score;

    if (complexityScore < this.options.minComplexityScore) {
      errors.push(`Password is too weak. Score: ${complexityScore}/4. Required: ${this.options.minComplexityScore}/4`);
      if (complexityResult.feedback.warning) {
        warnings.push(complexityResult.feedback.warning);
      }
      if (complexityResult.feedback.suggestions?.length > 0) {
        warnings.push(...complexityResult.feedback.suggestions);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: complexityScore,
      crackTime: complexityResult.crack_times_display.offline_slow_hashing_1e4_per_second
    };
  }

  /**
   * Check if password is in user's password history
   */
  async checkPasswordHistory(userId, newPasswordHash) {
    // This would need to be implemented based on your database structure
    // For now, return true (not in history)
    return true;
  }

  /**
   * Generate password strength indicator for UI
   */
  getStrengthIndicator(password, userInfo = {}) {
    const result = this.validatePassword(password, userInfo);
    
    let strength = 'weak';
    let color = 'red';
    let percentage = 0;

    if (result.score >= 4) {
      strength = 'very-strong';
      color = 'green';
      percentage = 100;
    } else if (result.score >= 3) {
      strength = 'strong';
      color = 'blue';
      percentage = 75;
    } else if (result.score >= 2) {
      strength = 'fair';
      color = 'yellow';
      percentage = 50;
    } else if (result.score >= 1) {
      strength = 'weak';
      color = 'orange';
      percentage = 25;
    } else {
      strength = 'very-weak';
      color = 'red';
      percentage = 10;
    }

    return {
      strength,
      color,
      percentage,
      score: result.score,
      crackTime: result.crackTime,
      errors: result.errors,
      warnings: result.warnings
    };
  }
}

export default PasswordValidator;
