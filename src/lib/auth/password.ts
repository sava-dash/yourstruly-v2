/**
 * Password validation utility for YoursTruly
 * Enforces strong password requirements
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: {
    score: number; // 0-4
    label: string;
    color: string;
  };
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

const MIN_LENGTH = 8;

/**
 * Validates a password against security requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const requirements = {
    minLength: password.length >= MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const errors: string[] = [];

  if (!requirements.minLength) {
    errors.push(`At least ${MIN_LENGTH} characters`);
  }
  if (!requirements.hasUppercase) {
    errors.push('At least 1 uppercase letter');
  }
  if (!requirements.hasLowercase) {
    errors.push('At least 1 lowercase letter');
  }
  if (!requirements.hasNumber) {
    errors.push('At least 1 number');
  }
  if (!requirements.hasSpecialChar) {
    errors.push('At least 1 special character (!@#$%^&*)');
  }

  const isValid = errors.length === 0;

  // Calculate strength score (0-4)
  let score = 0;
  if (password.length > 0) score++;
  if (password.length >= MIN_LENGTH) score++;
  if (requirements.hasUppercase && requirements.hasLowercase) score++;
  if (requirements.hasNumber && requirements.hasSpecialChar) score++;

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-gray-200', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-[#2D5A3D]'];

  return {
    isValid,
    errors,
    strength: {
      score,
      label: strengthLabels[score],
      color: strengthColors[score],
    },
    requirements,
  };
}

/**
 * Check if password meets minimum requirements
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).isValid;
}

/**
 * Get password requirements description
 */
export function getPasswordRequirements(): string[] {
  return [
    `At least ${MIN_LENGTH} characters`,
    'At least 1 uppercase letter (A-Z)',
    'At least 1 lowercase letter (a-z)',
    'At least 1 number (0-9)',
    'At least 1 special character (!@#$%^&*)',
  ];
}
