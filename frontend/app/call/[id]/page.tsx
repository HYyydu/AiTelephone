'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallStatusBadge } from '@/components/CallStatusBadge';
import { TranscriptView } from '@/components/TranscriptView';
import { Call, Transcript, CallStatus } from '@/lib/types';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/websocket';
import { ArrowLeft, Download, Loader2, Phone, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MissingInformationForm } from '@/components/MissingInformationForm';

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.id as string;

  const [call, setCall] = useState<Call | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callId) return;

    loadCallData();
    
    // Setup WebSocket listeners
    wsClient.connect();
    wsClient.joinCall(callId);

    // Define callbacks
    const handleTranscript = (transcript: Transcript) => {
      if (transcript.call_id === callId) {
        setTranscripts(prev => {
          // Check if transcript already exists to prevent duplicates
          const exists = prev.some(t => t.id === transcript.id);
          if (exists) {
            return prev;
          }
          return [...prev, transcript];
        });
      }
    };

    const handleCallStatus = (data: { call_id: string; status: CallStatus; duration?: number }) => {
      if (data.call_id === callId) {
        setCall(prev => prev ? { ...prev, status: data.status, duration_seconds: data.duration } : null);
      }
    };

    const handleCallEnded = (data: { call_id: string; outcome?: string; duration: number }) => {
      if (data.call_id === callId) {
        setCall(prev => prev ? {
          ...prev,
          status: 'completed',
          outcome: data.outcome,
          duration_seconds: data.duration
        } : null);
      }
    };

    // Register listeners
    wsClient.onTranscript(handleTranscript);
    wsClient.onCallStatus(handleCallStatus);
    wsClient.onCallEnded(handleCallEnded);

    // Cleanup: remove listeners and leave call
    return () => {
      wsClient.off('transcript', handleTranscript);
      wsClient.off('call_status', handleCallStatus);
      wsClient.off('call_ended', handleCallEnded);
      wsClient.leaveCall(callId);
    };
  }, [callId]);

  async function loadCallData() {
    try {
      setLoading(true);
      setError(null);

      const [callResponse, transcriptResponse] = await Promise.all([
        api.getCall(callId),
        api.getTranscripts(callId),
      ]);

      setCall(callResponse.call);
      setTranscripts(transcriptResponse.transcripts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load call');
    } finally {
      setLoading(false);
    }
  }

  function downloadTranscript() {
    const content = transcripts
      .map(t => `[${new Date(t.timestamp).toLocaleString()}] ${t.speaker === 'ai' ? 'AI' : 'Customer'}: ${t.message}`)
      .join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-${callId}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-red-600 mb-4">❌ {error || 'Call not found'}</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLive = call.status === 'in_progress' || call.status === 'calling';

  // Parse missing information from outcome
  const parseMissingInformation = (outcome?: string): string[] => {
    if (!outcome) return [];
    
    // Look for patterns like "Missing Information Required: item1, item2"
    const missingInfoMatch = outcome.match(/Missing Information Required:\s*([^.]+)/i);
    if (missingInfoMatch) {
      return missingInfoMatch[1]
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    
    // Also check for "the following information was requested" pattern
    const requestedInfoMatch = outcome.match(/following information was requested.*?but was not available:\s*([^.]+)/i);
    if (requestedInfoMatch) {
      return requestedInfoMatch[1]
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    
    return [];
  };

  const missingInformation = parseMissingInformation(call.outcome);
  const needsFollowUp = missingInformation.length > 0 && call.status === 'completed';

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Missing Information Form */}
        {needsFollowUp && (
          <MissingInformationForm call={call} missingInfo={missingInformation} />
        )}

        {/* Call Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Phone className="h-5 w-5" />
                  {call.phone_number}
                  <CallStatusBadge status={call.status} />
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  {call.duration_seconds && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(call.duration_seconds)}
                    </span>
                  )}
                  <span>
                    {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                  </span>
                  {call.voice_preference && (
                    <span className="capitalize">
                      {call.voice_preference.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
              
              {transcripts.length > 0 && (
                <Button onClick={downloadTranscript} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Purpose</h4>
                <p className="text-sm text-gray-900">{call.purpose}</p>
              </div>
              
              {call.additional_instructions && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Additional Instructions</h4>
                  <p className="text-sm text-gray-900">{call.additional_instructions}</p>
                </div>
              )}

              {call.outcome && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Outcome</h4>
                  <p className="text-sm text-gray-900 italic">💬 {call.outcome}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isLive ? '🔴 Live Transcript' : '📝 Call Transcript'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TranscriptView transcripts={transcripts} isLive={isLive} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

