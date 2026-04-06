"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Loader2, LogIn } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { SignInDialog } from "@/components/SignInDialog";

export default function StartCallPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callIdInput, setCallIdInput] = useState("");

  async function handleStartCall(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !purpose.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { call } = await api.createCall({
        phone_number: phone.trim(),
        purpose: purpose.trim(),
        additional_instructions: additionalInstructions.trim() || undefined,
      });
      router.push(`/call/${call.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start call");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenCallById(e: React.FormEvent) {
    e.preventDefault();
    const id = callIdInput.trim();
    if (id) router.push(`/call/${id}`);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Call & Live Transcript Test
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Start a call and watch the live transcript during the call.
          </p>
        </div>

        {!isAuthenticated ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-4">
                Sign in to start a test call and view live transcripts.
              </p>
              <Button onClick={() => setSignInOpen(true)} className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5" />
                  Start a new call
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStartCall} className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+15551234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="purpose">Purpose / script</Label>
                    <Textarea
                      id="purpose"
                      placeholder="e.g. Request refund for order #123"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="mt-1 min-h-[80px]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructions">Additional instructions (optional)</Label>
                    <Textarea
                      id="instructions"
                      placeholder="Any extra instructions for the AI"
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <Button type="submit" disabled={submitting} className="w-full gap-2">
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                    {submitting ? "Starting call…" : "Start call"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Open existing call</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOpenCallById} className="flex gap-2">
                  <Input
                    placeholder="Call ID"
                    value={callIdInput}
                    onChange={(e) => setCallIdInput(e.target.value)}
                  />
                  <Button type="submit" variant="secondary">
                    Open
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      </div>
    </main>
  );
}
