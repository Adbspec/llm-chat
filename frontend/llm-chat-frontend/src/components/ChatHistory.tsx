// src/app/component/ChatHistory.tsx
import React, { RefObject } from 'react';
import ThinkingLoader from './ThinkingLoader'; // Assuming you have this

interface Message {
  sender: string;
  text: string;
  timestamp?: Date;
  tokens?: number;
  time_s?: number;
  tps?: number;
}

interface ChatHistoryProps {
  history: Message[];
  showThinking: boolean;
  chatHistoryRef: RefObject<HTMLDivElement>;
}

export default function ChatHistory({ history, showThinking, chatHistoryRef }: ChatHistoryProps) {
  return (
    <div ref={chatHistoryRef} className="flex-1 overflow-y-auto py-5 space-y-4 chat-scrollbar">
      {history.map((entry, index) => (
        <div key={index} className="space-y-1">
          <div>
            <strong>{entry.sender}:</strong> {entry.text}
          </div>
          {entry.tps && (
            <div className="text-xs text-gray-400 italic">
              Time: {entry.time_s?.toFixed(2)}s | Tokens: {entry.tokens} | TPS: {entry.tps?.toFixed(2)}
            </div>
          )}
        </div>
      ))}

      {/* Thinking Loader */}
      {showThinking && <ThinkingLoader />}
    </div>
  );
}