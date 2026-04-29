// Authentication middleware for Express routes
import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from './supabase';
import { config } from '../config';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        name?: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using Supabase JWT tokens
 * Extracts user from Authorization header and attaches to request
 * 
 * Usage:
 *   router.get('/protected', authenticateUser, (req, res) => {
 *     const userId = req.user?.id; // User ID is available here
 *   });
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For optional auth, we allow requests without tokens
      // But we won't attach a user to the request
      return next();
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const user = await verifyAuthToken(token);

    if (!user) {
      // Token is invalid or expired, but we allow the request to continue
      // The route can check req.user to see if user is authenticated
      return next();
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    };

    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    // Don't block the request, just continue without user
    next();
  }
}

/**
 * Optional server-to-server auth shortcut:
 * - If CALL_API_TOKEN is set and Bearer token matches it, attach API user.
 * - Otherwise pass through so authenticateUser can validate a Supabase JWT.
 */
export function authenticateCallApiToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!config.auth.callApiToken) {
    next();
    return;
  }

  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = auth.split(" ")[1];

  if (token !== config.auth.callApiToken) {
    // Not the API token: fall through to Supabase auth middleware.
    // If it's not a valid Supabase JWT either, requireAuth will reject later.
    next();
    return;
  }

  req.user = {
    id: config.auth.callApiTokenUserId,
    name: "API",
  };
  next();
}

/**
 * Middleware that requires authentication
 * Returns 401 if user is not authenticated, unless config.auth.allowNoAuth is true (e.g. ALLOW_NO_AUTH=true)
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (config.auth.allowNoAuth) {
    return next();
  }
  if (!req.user || !req.user.id) {
    console.log("HEADERS:", req.headers);
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }
  next();
}

