"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallStatusBadge } from "@/components/CallStatusBadge";
import { TranscriptView } from "@/components/TranscriptView";
import { Call, Transcript, CallStatus } from "@/lib/types";
import { api } from "@/lib/api";
import { wsClient, getWsDisplayUrl } from "@/lib/websocket";
import {
  ArrowLeft,
  Download,
  Loader2,
  Phone,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  PhoneOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MissingInformationForm } from "@/components/MissingInformationForm";

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.id as string;

  const [call, setCall] = useState<Call | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsState, setWsState] = useState<
    "disconnected" | "connecting" | "connected" | "reconnecting" | "error"
  >("disconnected");
  const [isOnHold, setIsOnHold] = useState(false);
  const [conversationState, setConversationState] = useState<
    "PRE_ANSWER" | "ACTIVE_CONVERSATION" | "ON_HOLD"
  >("PRE_ANSWER");
  // Strong signal: set when we receive call_ended from backend (e.g. user hung up); used to show "Call ended" feedback
  const [callEndedSignalAt, setCallEndedSignalAt] = useState<number | null>(
    null
  );

  // Drop consecutive duplicate messages (same speaker + same text) for display only
  const transcriptsDeduped = useMemo(() => {
    return transcripts.filter((t, i) => {
      const prev = transcripts[i - 1];
      if (!prev) return true;
      return (
        prev.speaker !== t.speaker ||
        prev.message.trim() !== t.message.trim()
      );
    });
  }, [transcripts]);

  /** DB is source of truth if Socket.IO misses call_ended (e.g. client disconnects first). */
  const refreshCallStatus = useCallback(async () => {
    if (!callId) return;
    try {
      const { call: fresh } = await api.getCall(callId);
      setCall((prev) => {
        if (!prev || !fresh) return prev;
        return {
          ...prev,
          status: fresh.status,
          duration_seconds: fresh.duration_seconds ?? prev.duration_seconds,
          outcome: fresh.outcome ?? prev.outcome,
          ended_at: fresh.ended_at ?? prev.ended_at,
        };
      });
    } catch {
      /* offline / transient */
    }
  }, [callId]);

  useEffect(() => {
    if (!callId) return;

    loadCallData();

    // Define callbacks first
    const handleTranscript = (transcript: Transcript) => {
      if (transcript.call_id === callId) {
        setTranscripts((prev) => {
          // Check if transcript already exists by id (same event)
          const existsById = prev.some((t) => t.id === transcript.id);
          if (existsById) return prev;
          // Check if we already have the same speaker + message (duplicate content, different id)
          const sameContent = prev.some(
            (t) =>
              t.speaker === transcript.speaker &&
              t.message.trim() === transcript.message.trim()
          );
          if (sameContent) return prev;
          return [...prev, transcript];
        });
      }
    };

    const handleCallStatus = (data: {
      call_id: string;
      status: CallStatus;
      duration?: number;
    }) => {
      if (data.call_id === callId) {
        setCall((prev) =>
          prev
            ? { ...prev, status: data.status, duration_seconds: data.duration }
            : null
        );
      }
    };

    const handleCallEnded = (data: {
      call_id: string;
      outcome?: string;
      duration: number;
      ended_at?: string;
    }) => {
      if (data.call_id === callId) {
        setCall((prev) =>
          prev
            ? {
                ...prev,
                status: "completed",
                outcome: data.outcome,
                duration_seconds: data.duration,
                ...(data.ended_at ? { ended_at: data.ended_at } : {}),
              }
            : null
        );
        // Strong signal: show "Call ended" feedback to user (e.g. after hanging up)
        setCallEndedSignalAt(Date.now());
      }
    };

    const handleCallHoldStatus = (data: {
      call_id: string;
      is_on_hold: boolean;
      conversation_state:
        | "PRE_ANSWER"
        | "ACTIVE_CONVERSATION"
        | "ON_HOLD";
    }) => {
      if (data.call_id === callId) {
        setIsOnHold(data.is_on_hold);
        setConversationState(data.conversation_state);
      }
    };

    // Setup WebSocket connection and register listeners
    const socket = wsClient.connect();

    // Track connection status
    setWsConnected(socket.connected);
    setWsState(wsClient.getState());

    // Subscribe to connection state changes
    const unsubscribeState = wsClient.onStateChange((state) => {
      setWsState(state);
      setWsConnected(state === "connected");
    });

    // Register listeners immediately (they'll work even if not connected yet)
    wsClient.onTranscript(handleTranscript);
    wsClient.onCallStatus(handleCallStatus);
    wsClient.onCallEnded(handleCallEnded);
    wsClient.onCallHoldStatus(handleCallHoldStatus);

    // Join call room - will queue if not connected yet
    wsClient.joinCall(callId);

    // Also join when connection is established (in case it wasn't connected initially)
    const onConnect = () => {
      console.log(`✅ WebSocket connected, joining call: ${callId}`);
      setWsConnected(true);
      wsClient.joinCall(callId);
      void refreshCallStatus();
    };

    const onDisconnect = () => {
      console.log(`❌ WebSocket disconnected`);
      setWsConnected(false);
      void refreshCallStatus();
    };

    if (socket.connected) {
      // Already connected, join immediately
      wsClient.joinCall(callId);
    } else {
      // Wait for connection
      socket.on("connect", onConnect);
    }

    socket.on("disconnect", onDisconnect);

    // Cleanup: remove listeners and leave call
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      wsClient.off("transcript", handleTranscript);
      wsClient.off("call_status", handleCallStatus);
      wsClient.off("call_ended", handleCallEnded);
      wsClient.off("call_hold_status", handleCallHoldStatus);
      unsubscribeState();
      wsClient.leaveCall(callId);
    };
  }, [callId, refreshCallStatus]);

  // While Twilio still shows the call as live in the DB, poll — fixes "stuck" Live badge after missed WS events
  useEffect(() => {
    if (!callId || !call) return;
    if (call.status !== "in_progress" && call.status !== "calling") return;

    const id = setInterval(() => {
      void refreshCallStatus();
    }, 8000);

    const onVis = () => {
      if (document.visibilityState === "visible") void refreshCallStatus();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [callId, call?.status, refreshCallStatus]);

  // Auto-hide "Call ended" banner after 5 seconds
  useEffect(() => {
    if (callEndedSignalAt === null) return;
    const t = setTimeout(() => setCallEndedSignalAt(null), 5000);
    return () => clearTimeout(t);
  }, [callEndedSignalAt]);

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
      setError(err instanceof Error ? err.message : "Failed to load call");
    } finally {
      setLoading(false);
    }
  }

  function downloadTranscript() {
    const content = transcripts
      .map(
        (t) =>
          `[${new Date(t.timestamp).toLocaleString()}] ${
            t.speaker === "ai" ? "AI" : "Customer"
          }: ${t.message}`
      )
      .join("\n\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-${callId}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return "N/A";
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
            <p className="text-red-600 mb-4">❌ {error || "Call not found"}</p>
            <Link href="/start">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Start another call
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLive = call.status === "in_progress" || call.status === "calling";

  // Parse missing information from outcome
  const parseMissingInformation = (outcome?: string): string[] => {
    if (!outcome) return [];

    // Look for patterns like "Missing Information Required: item1, item2"
    const missingInfoMatch = outcome.match(
      /Missing Information Required:\s*([^.]+)/i
    );
    if (missingInfoMatch) {
      return missingInfoMatch[1]
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    // Also check for "the following information was requested" pattern
    const requestedInfoMatch = outcome.match(
      /following information was requested.*?but was not available:\s*([^.]+)/i
    );
    if (requestedInfoMatch) {
      return requestedInfoMatch[1]
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    return [];
  };

  const missingInformation = parseMissingInformation(call.outcome);
  const needsFollowUp =
    missingInformation.length > 0 && call.status === "completed";

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
            <Link href="/start">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Start another call
              </Button>
            </Link>
        </div>

        {/* Call ended signal — strong feedback when user hangs up */}
        {callEndedSignalAt !== null && (
          <Card className="mb-6 border-green-200 bg-green-50 shadow-md">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-green-800">
                <PhoneOff className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold">Call ended</p>
                  <p className="text-sm text-green-700">
                    The call has ended. Summary and transcript are below.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missing Information Form */}
        {needsFollowUp && (
          <MissingInformationForm
            call={call}
            missingInfo={missingInformation}
          />
        )}

        {/* Pre-answer: IVR / queue before live conversation phase (see CALL_PRE_ANSWER_ADVANCE_MODE) */}
        {conversationState === "PRE_ANSWER" && isLive && !isOnHold && (
          <Card className="mb-6 border-sky-200 bg-sky-50 shadow-md">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-sky-900">
                <Phone className="h-6 w-6 text-sky-600" />
                <div>
                  <p className="font-semibold">Connecting</p>
                  <p className="text-sm text-sky-800">
                    Waiting on menu, ring, or queue (pre-answer). Conversation phase starts when the
                    session advances per server settings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Music Hold Signal */}
        {isOnHold && isLive && (
          <Card className="mb-6 border-amber-200 bg-amber-50 shadow-md animate-pulse">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-amber-800">
                <Clock className="h-6 w-6 text-amber-600" />
                <div>
                  <p className="font-semibold">Call is on hold</p>
                  <p className="text-sm text-amber-700">
                    Hold music detected. Audio to AI is paused to save tokens, waiting for speech to return...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection Error Alert */}
        {wsState === "error" && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">
                    WebSocket Connection Failed
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    Unable to connect to the server. This may be due to:
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1 mb-3">
                    <li>Cloudflare tunnel URL has changed or expired</li>
                    <li>Backend server is not running</li>
                    <li>Network connectivity issues</li>
                  </ul>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => wsClient.reconnect()}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Connection
                    </Button>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Reload Page
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call Info */}
        <Card className={`mb-6 ${isLive ? "sticky top-4 z-10 shadow-lg" : ""}`}>
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
                    {formatDistanceToNow(new Date(call.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {call.voice_preference && (
                    <span className="capitalize">
                      {call.voice_preference.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>

              {/* WebSocket Connection Status */}
              <div className="flex items-center gap-2">
                {wsState === "connected" && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Wifi className="h-4 w-4" />
                    <span>Connected</span>
                  </div>
                )}
                {wsState === "connecting" && (
                  <div className="flex items-center gap-1 text-sm text-yellow-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </div>
                )}
                {wsState === "reconnecting" && (
                  <div className="flex items-center gap-1 text-sm text-yellow-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Reconnecting...</span>
                  </div>
                )}
                {(wsState === "disconnected" || wsState === "error") && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <WifiOff className="h-4 w-4" />
                      <span>Disconnected</span>
                    </div>
                    <Button
                      onClick={() => wsClient.reconnect()}
                      variant="outline"
                      size="sm"
                      className="h-7"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                )}
              </div>

              {transcripts.length > 0 && (
                <Button
                  onClick={downloadTranscript}
                  variant="outline"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLive && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      📋 CALL SCRIPT
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      Purpose
                    </h4>
                    <p className="text-sm text-gray-900 font-medium">
                      {call.purpose}
                    </p>
                  </div>

                  {call.additional_instructions && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Additional Instructions
                      </h4>
                      <p className="text-sm text-gray-900 font-medium">
                        {call.additional_instructions}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!isLive && (
                <>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Purpose
                    </h4>
                    <p className="text-sm text-gray-900">{call.purpose}</p>
                  </div>

                  {call.additional_instructions && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">
                        Additional Instructions
                      </h4>
                      <p className="text-sm text-gray-900">
                        {call.additional_instructions}
                      </p>
                    </div>
                  )}
                </>
              )}

              {call.outcome && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Outcome
                  </h4>
                  <p className="text-sm text-gray-900 italic">
                    💬 {call.outcome}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {isLive ? "🔴 Live Transcript" : "📝 Call Transcript"}
              </CardTitle>
              {isLive && (
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      wsConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span
                    className={wsConnected ? "text-green-600" : "text-red-600"}
                  >
                    {wsConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLive && !wsConnected && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                <p className="text-sm text-yellow-800">
                  ⚠️ WebSocket not connected. Transcripts may not appear in
                  real-time.
                </p>
                <p className="text-xs text-yellow-700 font-mono break-all">
                  Connecting to: {getWsDisplayUrl()}
                </p>
                <p className="text-xs text-yellow-700">
                  Ensure the backend is running and{" "}
                  <code className="bg-yellow-100 px-1 rounded">
                    NEXT_PUBLIC_WS_URL
                  </code>{" "}
                  in <code className="bg-yellow-100 px-1 rounded">.env.local</code> matches it. Check the browser console for errors.
                </p>
                <Button
                  onClick={() => wsClient.reconnect()}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry connection
                </Button>
              </div>
            )}
            <TranscriptView
              transcripts={transcriptsDeduped}
              isLive={isLive}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
