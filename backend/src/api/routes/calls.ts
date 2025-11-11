// Call management routes
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../../database/models/store';
import { CreateCallRequest, Call } from '../../types';
import { initiateCall } from '../../services/telephony';
import { validatePhoneNumber, validateCallPurpose, sanitizeInput } from '../../utils/validation';
import { callCreationLimiter } from '../../utils/rate-limiter';

const router = Router();

// POST /api/calls - Create and initiate a new call
router.post('/', callCreationLimiter, async (req: Request, res: Response) => {
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

    // Create call record with sanitized inputs
    const call: Call = {
      id: uuidv4(),
      phone_number: sanitizeInput(phone_number, 20),
      purpose: sanitizeInput(purpose, 500),
      status: 'queued',
      created_at: new Date(),
      voice_preference: voice_preference || 'professional_female',
      additional_instructions: additional_instructions ? sanitizeInput(additional_instructions, 500) : undefined,
    };

    // Save to database
    store.createCall(call);

    // Initiate the call (async, don't wait)
    initiateCall(call)
      .then(() => {
        console.log(`✅ Call initiated successfully: ${call.id}`);
      })
      .catch((error) => {
        console.error(`❌ Failed to initiate call: ${call.id}`, error);
        store.updateCall(call.id, { status: 'failed' });
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

// GET /api/calls - Get all calls
router.get('/', (req: Request, res: Response) => {
  try {
    const calls = store.getAllCalls();
    res.json({
      success: true,
      calls,
      count: calls.length,
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calls',
    });
  }
});

// GET /api/calls/:id - Get a specific call
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const call = store.getCall(id);

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

// GET /api/calls/:id/transcripts - Get transcripts for a call
router.get('/:id/transcripts', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const call = store.getCall(id);

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    const transcripts = store.getTranscripts(id);

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

// GET /api/calls/stats/summary - Get call statistics
router.get('/stats/summary', (req: Request, res: Response) => {
  try {
    const stats = store.getStats();
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

// DELETE /api/calls/:id - Delete a call (for testing)
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = store.deleteCall(id);

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

