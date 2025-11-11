// Validation utilities

export function validatePhoneNumber(phoneNumber: string): { valid: boolean; message?: string } {
  // Remove spaces and special characters except +
  const cleaned = phoneNumber.replace(/[\s()-]/g, '');
  
  // Check if it starts with + and has 10-15 digits
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  
  if (!phoneRegex.test(cleaned)) {
    return {
      valid: false,
      message: 'Phone number must be in international format (e.g., +1234567890)',
    };
  }
  
  return { valid: true };
}

export function sanitizeInput(input: string, maxLength: number = 1000): string {
  // Remove potentially dangerous characters
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, ''); // Remove HTML tags
}

export function validateCallPurpose(purpose: string): { valid: boolean; message?: string } {
  if (purpose.length < 10) {
    return {
      valid: false,
      message: 'Purpose must be at least 10 characters',
    };
  }
  
  if (purpose.length > 500) {
    return {
      valid: false,
      message: 'Purpose must be less than 500 characters',
    };
  }
  
  return { valid: true };
}

