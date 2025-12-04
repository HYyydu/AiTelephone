// Authentication routes
import { Router, Request, Response } from 'express';
import { authLimiter } from '../../utils/rate-limiter';
import { supabase, verifyAuthToken } from '../../utils/supabase';

const router = Router();

interface AuthRequest {
  email: string;
  password: string;
  name?: string;
}

interface PhoneAuthRequest {
  phone: string;
  token?: string; // OTP token for verification
}

// POST /api/auth/signup - Create new account
router.post('/signup', authLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, password }: AuthRequest = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    // Check if user already exists (using admin API to check all users, including unconfirmed)
    // This prevents duplicate signups when email confirmation is enabled
    try {
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      if (!listError && existingUsers) {
        const userExists = existingUsers.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (userExists) {
          // Check if email is confirmed
          if (userExists.email_confirmed_at) {
            return res.status(409).json({
              success: false,
              error: 'User with this email already exists. Please sign in instead.',
            });
          } else {
            return res.status(409).json({
              success: false,
              error: 'An account with this email already exists but is not verified. Please check your email for the confirmation link, or try signing in.',
            });
          }
        }
      }
    } catch (checkError) {
      // If admin API fails, continue with signup - Supabase will handle duplicate check
      console.warn('Could not check existing users:', checkError);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name, // Store name in user metadata
        },
      },
    });

    if (authError) {
      // Handle specific Supabase errors
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('already exists') ||
        authError.message.includes('User already registered')
      ) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists. Please sign in instead.',
        });
      }
      
      // Handle other Supabase error codes
      if (authError.message.includes('email_rate_limit_exceeded')) {
        return res.status(429).json({
          success: false,
          error: 'Too many signup attempts. Please try again later.',
        });
      }
      
      return res.status(400).json({
        success: false,
        error: authError.message || 'Failed to create account',
      });
    }

    if (!authData.user) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }

    // Get the session token
    const session = authData.session;
    if (!session) {
      // User created but email confirmation might be required
      return res.status(201).json({
        success: true,
        user: {
          id: authData.user.id,
          name: name,
          email: authData.user.email,
        },
        message: 'Account created successfully. Please check your email to verify your account.',
        requiresEmailVerification: true,
      });
    }

    res.status(201).json({
      success: true,
      user: {
        id: authData.user.id,
        name: name,
        email: authData.user.email,
      },
      token: session.access_token,
      refreshToken: session.refresh_token,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/auth/signin - Sign in existing user
router.post('/signin', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password }: AuthRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email and password are required',
      });
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Supabase returns specific error messages/codes for unconfirmed emails
      // We trust Supabase's error message - if it says email not confirmed, it's not confirmed
      const errorMessage = authError.message?.toLowerCase() || '';
      const errorStatus = authError.status;
      
      // Check for explicit email confirmation errors
      // Supabase returns these specific messages when email is not confirmed
      const isEmailNotConfirmed = 
        errorMessage.includes('email not confirmed') ||
        errorMessage.includes('email_not_confirmed') ||
        errorMessage.includes('email_not_verified') ||
        errorMessage.includes('email address not confirmed') ||
        (errorStatus === 403 && errorMessage.includes('sign in')); // Some Supabase configs return 403

      if (isEmailNotConfirmed) {
        return res.status(403).json({
          success: false,
          error: 'Please verify your email address before signing in. Check your inbox for the confirmation email. If you already verified, please wait a moment and try again - email confirmation can take a few seconds to process.',
        });
      }

      // Handle invalid credentials - trust Supabase's response
      // After email confirmation, if sign-in fails, it's likely wrong password
      if (
        errorMessage.includes('invalid login credentials') ||
        errorMessage.includes('invalid_credentials') ||
        errorMessage.includes('invalid password') ||
        errorMessage.includes('invalid email')
      ) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Handle rate limiting
      if (
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('email_rate_limit_exceeded')
      ) {
        return res.status(429).json({
          success: false,
          error: 'Too many sign-in attempts. Please try again later.',
        });
      }

      // For any other error, return Supabase's actual error message
      // This helps debug issues without masking the real problem
      return res.status(401).json({
        success: false,
        error: authError.message || 'Failed to sign in. Please check your credentials and try again.',
      });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Get user metadata (name stored in user_metadata)
    const userName = authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User';

    res.json({
      success: true,
      user: {
        id: authData.user.id,
        name: userName,
        email: authData.user.email,
      },
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      message: 'Signed in successfully',
    });
  } catch (error) {
    console.error('Error signing in:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign in',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/auth/refresh - Refresh authentication token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    // Refresh the session using Supabase
    const { data: authData, error: authError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (authError || !authData.session || !authData.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    const userName = authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User';

    res.json({
      success: true,
      user: {
        id: authData.user.id,
        name: userName,
        email: authData.user.email,
      },
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/auth/signout - Sign out user
router.post('/signout', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;

    if (token) {
      // Verify token is valid before signing out
      const user = await verifyAuthToken(token);
      if (!user) {
        // Token is already invalid/expired, but we'll still return success
        // as the user is effectively signed out
        return res.json({
          success: true,
          message: 'Signed out successfully',
        });
      }
      
      // Note: Supabase client-side signOut() should be called from the frontend
      // Server-side we just verify the token was valid
      // The client should call supabase.auth.signOut() to properly invalidate the session
    }

    res.json({
      success: true,
      message: 'Signed out successfully',
    });
  } catch (error) {
    console.error('Error signing out:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign out',
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // Verify token with Supabase
    const user = await verifyAuthToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

    res.json({
      success: true,
      user: {
        id: user.id,
        name: userName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
});

// POST /api/auth/phone/request - Request OTP for phone authentication
router.post('/phone/request', authLimiter, async (req: Request, res: Response) => {
  try {
    const { phone }: PhoneAuthRequest = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    // Validate phone number format (should be E.164: +1234567890)
    if (!phone.startsWith('+')) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be in E.164 format (e.g., +1234567890)',
      });
    }

    // Request OTP from Supabase
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phone,
    });

    if (error) {
      // Provide more helpful error messages for common issues
      let errorMessage = error.message || 'Failed to send OTP';
      
      if (error.message?.includes('20003') || error.message?.includes('Authenticate')) {
        errorMessage = 'Twilio authentication failed. Please check your Twilio credentials in Supabase Dashboard (Authentication → Providers → Phone). Error 20003 means incorrect Account SID, Auth Token, or Message Service SID.';
      } else if (error.message?.includes('Message Service')) {
        errorMessage = 'Twilio Message Service configuration error. Make sure you have created a Messaging Service and added it to Supabase.';
      }
      
      console.error('Error sending confirmation OTP to provider:', error);
      
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // Note: Supabase doesn't return the OTP in production (security)
      // For testing, you can check Supabase dashboard → Authentication → Users
    });
  } catch (error) {
    console.error('Error requesting phone OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/auth/phone/verify - Verify OTP and sign in
router.post('/phone/verify', authLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, token }: PhoneAuthRequest = req.body;

    if (!phone || !token) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP token are required',
      });
    }

    // Verify OTP and sign in
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      phone: phone,
      token: token,
      type: 'sms',
    });

    if (authError || !authData.user || !authData.session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired OTP',
      });
    }

    // Get user metadata
    const userName = authData.user.user_metadata?.name || phone;

    res.json({
      success: true,
      user: {
        id: authData.user.id,
        name: userName,
        phone: authData.user.phone,
        email: authData.user.email,
      },
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      message: 'Phone verified and signed in successfully',
    });
  } catch (error) {
    console.error('Error verifying phone OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

