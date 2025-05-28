'use client';
import React from 'react';
interface Props { onOpenSidebar: () => void; }
export const Header: React.FC<Props> = ({ onOpenSidebar }) => (
  <div className="md:hidden flex items-center justify-between mb-4">
    <button id="hamburger-button" onClick={onOpenSidebar} className="p-2 hover:bg-gray-700 rounded-md">
      {/* icon */}
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <h1 className="text-2xl">🦜🔗 Mini ChatGPT</h1>
    <div className="w-10" />
  </div>
);