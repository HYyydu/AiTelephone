'use client';

import { useEffect, useRef } from 'react';
import { Transcript } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { User, Bot } from 'lucide-react';

interface TranscriptViewProps {
  transcripts: Transcript[];
  isLive?: boolean;
}

export function TranscriptView({ transcripts, isLive }: TranscriptViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, isLive]);

  if (transcripts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No transcript available yet</p>
        {isLive && (
          <p className="text-sm mt-2">Waiting for conversation to begin...</p>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scroll-smooth"
    >
      {transcripts.map((transcript, index) => {
        const isAI = transcript.speaker === 'ai';
        const Icon = isAI ? Bot : User;
        
        // Use a combination of id, timestamp, and index to ensure uniqueness
        const uniqueKey = `${transcript.id}-${transcript.timestamp}-${index}`;
        
        return (
          <div
            key={uniqueKey}
            className={`flex gap-3 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isAI ? 'bg-blue-100' : 'bg-green-100'
              }`}
            >
              <Icon className={`h-4 w-4 ${isAI ? 'text-blue-600' : 'text-green-600'}`} />
            </div>

            <div className={`flex-1 ${!isAI && 'text-right'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${isAI ? 'text-blue-700' : 'text-green-700'}`}>
                  {isAI ? '🤖 AI Assistant' : '👤 Customer'}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(transcript.timestamp), { addSuffix: true })}
                </span>
                {transcript.confidence && (
                  <span className="text-xs text-gray-400">
                    ({Math.round(transcript.confidence * 100)}%)
                  </span>
                )}
              </div>
              
              <div
                className={`inline-block rounded-lg px-4 py-2 ${
                  isAI
                    ? 'bg-blue-50 text-blue-900 border border-blue-100'
                    : 'bg-green-50 text-green-900 border border-green-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{transcript.message}</p>
              </div>
            </div>
          </div>
        );
      })}

      {isLive && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="animate-pulse flex gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animation-delay-400"></div>
          </div>
          <span className="text-xs text-gray-500">Live</span>
        </div>
      )}
    </div>
  );
}

