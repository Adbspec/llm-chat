'use client';

import React from 'react';

export default function ThinkingLoader() {
  return (
    <div className="flex items-center gap-2 p-4 bg-gray-800 bg-opacity-80 rounded-lg animate-pulse">
      <span className="text-gray-400 italic">Bot is thinking</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}