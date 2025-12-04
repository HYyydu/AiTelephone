'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { CallStatusBadge } from './CallStatusBadge';
import { Call } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Phone, Clock, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface CallListProps {
  refreshTrigger?: number;
}

export function CallList({ refreshTrigger }: CallListProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCalls();
  }, [refreshTrigger]);

  async function loadCalls() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCalls();
      setCalls(response.calls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calls');
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm text-red-800">❌ {error}</p>
        <Button onClick={loadCalls} variant="outline" className="mt-2" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-12">
        <Phone className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No calls yet</h3>
        <p className="text-sm text-gray-500">
          Create your first call using the form above
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <Card key={call.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CallStatusBadge status={call.status} />
                  <span className="text-sm font-medium text-gray-900">
                    {call.phone_number}
                  </span>
                  {call.duration_seconds && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(call.duration_seconds)}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {call.purpose}
                </p>

                {call.outcome && (
                  <p className="text-xs text-gray-500 italic mb-2">
                    💬 {call.outcome}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400">
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

              <div className="ml-4">
                <Link href={`/call/${call.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    {call.status === 'in_progress' ? 'View Live' : 'View'}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

