
'use client';

import React from 'react';

interface Chat {
  chat_id: string;
  title?: string;
}

interface SidebarProps {
  chats: Chat[];
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  createNewChat: () => void;
  loadChat: (chatId: string) => void;
}

export default function Sidebar({ chats, sidebarOpen, setSidebarOpen, createNewChat, loadChat }: SidebarProps) {

  return (
    <div
      id="sidebar"
      className={`
        w-80 bg-gray-800 p-5 border-r border-gray-700 overflow-y-auto
        fixed md:relative z-50 h-full
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`
      }
    >
      {/* Mobile Close Button */}
      <div className="md:hidden flex justify-between items-center mb-4">
        <h2 className="text-lg">Conversations</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-2 hover:bg-gray-700 rounded-md"
        >
          ✕
        </button>
      </div>
      
      <h2 className="text-lg mb-5 hidden md:block">Conversations</h2>
      
      <button
        onClick={createNewChat}
        className="w-full p-3 bg-red-500 hover:bg-red-600 rounded-md mb-5 flex items-center gap-2 transition-colors"
      >
        ➕ New Chat
      </button>
      <div className="space-y-2">
        {chats.map((chat) => (
          <button
            key={chat.chat_id}
            onClick={() => loadChat(chat.chat_id)}
            className="w-full p-3 text-left border border-gray-600 hover:bg-gray-700 rounded-md transition-colors break-words"
          >
            {chat.title || chat.chat_id}
          </button>
        ))}
      </div>
    </div>
  );
}