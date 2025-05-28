// src/app/component/ChatInput.tsx
import React from 'react';

interface ChatInputProps {
  chatInput: string;
  setChatInput: (value: string) => void;
  sendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
}

export default function ChatInput({
  chatInput,
  setChatInput,
  sendMessage,
  handleKeyPress,
}: ChatInputProps) {
  return (
    <div className="flex-none flex gap-3 items-center bg-gray-900 p-3">
      <input
        type="text"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="You:"
        className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-md text-sm"
      />
      <button
        onClick={sendMessage}
        className="px-5 py-3 bg-red-500 hover:bg-red-600 rounded-md text-sm transition-colors"
      >
        Send
      </button>
    </div>
  );
}