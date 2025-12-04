// Call management routes
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CallService, TranscriptService } from '../../database/services/call-service';
import { CreateCallRequest, Call } from '../../types';
import { initiateCall } from '../../services/telephony';
import { validatePhoneNumber, validateCallPurpose, sanitizeInput } from '../../utils/validation';
import { callCreationLimiter } from '../../utils/rate-limiter';
import { authenticateUser, requireAuth } from '../../utils/auth-middleware';

const router = Router();

// POST /api/calls - Create and initiate a new call
// authenticateUser extracts user from token (optional - allows unauthenticated calls)
// requireAuth ensures user is authenticated (required for user-specific calls)
router.post('/', authenticateUser, requireAuth, callCreationLimiter, async (req: Request, res: Response) => {
  try {
    const { phone_number, purpose, voice_preference, additional_instructions }: CreateCallRequest = req.body;

    // Validation
    if (!phone_number || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phone_number and purpose are required',
      });
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(phone_number);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        error: phoneValidation.message,
      });
    }

    // Validate purpose
    const purposeValidation = validateCallPurpose(purpose);
    if (!purposeValidation.valid) {
      return res.status(400).json({
        success: false,
        error: purposeValidation.message,
      });
    }

    // Get user ID from authenticated request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to create calls',
      });
    }

    // Create call record with sanitized inputs
    // All calls now use GPT-4o Realtime
    console.log(`📝 Creating call with GPT-4o Realtime for user: ${userId}`);
    
    const call: Call = {
      id: uuidv4(),
      user_id: userId, // Associate call with user
      phone_number: sanitizeInput(phone_number, 20),
      purpose: sanitizeInput(purpose, 500),
      status: 'queued',
      created_at: new Date(),
      voice_preference: voice_preference || 'professional_female',
      additional_instructions: additional_instructions ? sanitizeInput(additional_instructions, 500) : undefined,
    };
    
    console.log(`✅ Call created: ${call.id}, user_id: ${call.user_id}`);

    // Save to database
    await CallService.createCall(call);

    // Initiate the call (async, don't wait)
    initiateCall(call)
      .then(() => {
        console.log(`✅ Call initiated successfully: ${call.id}`);
      })
      .catch(async (error) => {
        console.error(`❌ Failed to initiate call: ${call.id}`, error);
        await CallService.updateCall(call.id, { status: 'failed' });
      });

    res.status(201).json({
      success: true,
      call,
      message: 'Call queued successfully',
    });
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create call',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/calls - Get all calls (filtered by authenticated user)
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    // Get user ID from authenticated request (if available)
    const userId = req.user?.id;
    
    // Only return calls for the authenticated user
    // If no user is authenticated, return empty array
    const callsList = userId ? await CallService.getAllCalls(userId) : [];
    
    res.json({
      success: true,
      calls: callsList,
      count: callsList.length,
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calls',
    });
  }
});

// GET /api/calls/:id - Get a specific call (only if it belongs to the authenticated user)
router.get('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Get call, filtering by user_id if user is authenticated
    const call = await CallService.getCall(id, userId);

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    res.json({
      success: true,
      call,
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call',
    });
  }
});

// GET /api/calls/:id/transcripts - Get transcripts for a call (only if it belongs to the authenticated user)
router.get('/:id/transcripts', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Get call, filtering by user_id if user is authenticated
    const call = await CallService.getCall(id, userId);

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    const transcripts = await TranscriptService.getTranscripts(id);

    res.json({
      success: true,
      transcripts,
      count: transcripts.length,
    });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcripts',
    });
  }
});

// GET /api/calls/stats/summary - Get call statistics (filtered by authenticated user)
router.get('/stats/summary', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const stats = await CallService.getStats(userId);
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

// DELETE /api/calls/:id - Delete a call (only if it belongs to the authenticated user)
router.delete('/:id', authenticateUser, requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Verify the call belongs to the user before deleting
    const call = await CallService.getCall(id, userId);
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }
    
    const deleted = await CallService.deleteCall(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    res.json({
      success: true,
      message: 'Call deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete call',
    });
  }
});

export default router;

