// Centralized error handling utilities

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class TwilioError extends AppError {
  constructor(message: string) {
    super(`Twilio error: ${message}`, 503);
  }
}

export class AIServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 503);
  }
}

export function handleServiceError(error: any, serviceName: string): never {
  console.error(`❌ ${serviceName} error:`, error);
  
  if (error.response) {
    // API error with response
    throw new AIServiceError(
      serviceName,
      error.response.data?.message || error.response.statusText
    );
  } else if (error.request) {
    // No response received
    throw new AIServiceError(serviceName, 'No response from service');
  } else {
    // Other errors
    throw new AIServiceError(serviceName, error.message);
  }
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`⚠️  Attempt ${attempt}/${maxRetries} failed, retrying...`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
}

