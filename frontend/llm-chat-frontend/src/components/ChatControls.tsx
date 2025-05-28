// src/app/component/ChatControls.tsx
import React from 'react';

interface ChatControlsProps {
  selectedModel: string;
  computeMode: string;
  models: string[];
  loaded: boolean;
  processing: boolean;
  onModelChange: (value: string) => void;
  onComputeModeChange: (value: string) => void;
  onToggleModel: () => void;
  chatId: string | null;
}

export default function ChatControls({
  selectedModel,
  computeMode,
  models,
  loaded,
  processing,
  onModelChange,
  onComputeModeChange,
  onToggleModel,
  chatId,
}: ChatControlsProps) {
  return (
    <div className="flex-none space-y-5 mb-5">
      <div>
        <label className="block mb-2 text-sm">Select model</label>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-sm"
        >
          {models.length === 0 ? (
            <option value="">Loading models...</option>
          ) : (
            models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))
          )}
        </select>
      </div>

      <div>
        <label className="block mb-2 text-sm">Compute Mode</label>
        <select
          value={computeMode}
          onChange={(e) => onComputeModeChange(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-sm"
        >
          <option value="auto">auto</option>
          <option value="cpu">cpu</option>
          <option value="gpu">gpu</option>
        </select>
      </div>

      <button
        onClick={onToggleModel}
        disabled={processing}
        className="px-5 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm transition-colors"
      >
        {loaded ? 'Unload Model' : 'Load Model'}
      </button>

      <div className="text-sm space-y-1">
        <div><strong>Chat ID:</strong> <span className="break-all">{chatId}</span></div>
        <div><strong>Status:</strong> {loaded ? 'Loaded' : 'Not loaded'}</div>
      </div>
    </div>
  );
}