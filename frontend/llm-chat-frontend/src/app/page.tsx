'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Types
interface Message {
  sender: string;
  text: string;
  timestamp?: Date;
  tokens?: number;
  time_s?: number;
  tps?: number;
}

interface Chat {
  chat_id: string;
  title?: string;
  model?: string;
  device?: string;
}

interface AppState {
  chatId: string | null;
  history: Message[];
  selectedModel: string;
  computeMode: string;
  loaded: boolean;
  processing: boolean;
  models: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<AppState>({
    chatId: null,
    history: [],
    selectedModel: '',
    computeMode: 'auto',
    loaded: false,
    processing: false,
    models: []
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showThinking, setShowThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      const chatId = searchParams.get('chat_id');
      
      if (chatId) {
        setState(prev => ({ ...prev, chatId }));
        await loadChatHistory(chatId);
        await loadChatStatus(chatId);
      }

      await loadModels();
      await loadChatList();
    };

    initApp();
  }, [searchParams]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const hamburger = document.getElementById('hamburger-button');
      
      if (sidebarOpen && sidebar && hamburger && 
          !sidebar.contains(event.target as Node) && 
          !hamburger.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  // Scroll to bottom when history updates
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [state.history, showThinking]);

  // Load available models
  const loadModels = async () => {
    try {
      const response = await fetch(`${API_URL}/models`);
      if (response.ok) {
        const models = await response.json();
        setState(prev => ({
          ...prev,
          models,
          selectedModel: prev.selectedModel || (models.length > 0 ? models[0] : '')
        }));
      } else {
        console.warn('Failed to load models from API');
        setState(prev => ({ ...prev, models: [] }));
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setState(prev => ({ ...prev, models: [] }));
    }
  };

  // Load chat list
  const loadChatList = async () => {
    try {
      const response = await fetch(`${API_URL}/chats`);
      const chatList = response.ok ? await response.json() : [];
      setChats(chatList);
    } catch (error) {
      console.error('Failed to load chat list:', error);
      setChats([]);
    }
  };

  // Load chat history
  const loadChatHistory = async (chatId: string) => {
    try {
      const response = await fetch(`${API_URL}/history?chat_id=${chatId}`);
      if (response.ok) {
        const messages = await response.json();
        setState(prev => ({
          ...prev,
          history: messages.map((msg: any) => ({
            sender: msg.sender,
            text: msg.text,
            timestamp: new Date(msg.timestamp),
            ...msg
          }))
        }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  // Load chat status
  const loadChatStatus = async (chatId: string) => {
    try {
      const response = await fetch(`${API_URL}/status?chat_id=${chatId}`);
      if (response.ok) {
        const status = await response.json();
        setState(prev => ({
          ...prev,
          selectedModel: status.model || prev.selectedModel,
          computeMode: status.device || 'auto',
          loaded: status.loaded || false
        }));
      }
    } catch (error) {
      console.error('Failed to load chat status:', error);
    }
  };

  // Generate UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Create new chat
  const createNewChat = () => {
    const newChatId = generateUUID();
    router.push(`/?chat_id=${newChatId}`);
    setState(prev => ({
      ...prev,
      chatId: newChatId,
      history: []
    }));
    setSidebarOpen(false); // Close sidebar on mobile after creating new chat
  };

  // Load existing chat
  const loadChat = async (chatId: string) => {
    router.push(`/?chat_id=${chatId}`);
    setState(prev => ({
      ...prev,
      chatId,
      history: []
    }));
    
    await loadChatHistory(chatId);
    await loadChatStatus(chatId);
    setSidebarOpen(false); // Close sidebar on mobile after selecting chat
  };

  // Toggle model load/unload
  const toggleModel = async () => {
    if (state.processing) return;
    
    setState(prev => ({ ...prev, processing: true }));
    
    try {
      const payload = {
        chat_id: state.chatId,
        model: state.selectedModel,
        device: state.computeMode
      };
      
      const endpoint = state.loaded ? '/unload' : '/load';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setState(prev => ({
          ...prev,
          loaded: !prev.loaded,
          history: endpoint === '/unload' ? [] : prev.history
        }));
        
        const message = endpoint === '/unload' 
          ? `Unloaded ${state.selectedModel}`
          : `Loaded ${state.selectedModel} on ${state.computeMode}`;
        alert(message);
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
    
    setState(prev => ({ ...prev, processing: false }));
  };

  // Send message
  const sendMessage = async () => {
    const message = chatInput.trim();
    
    if (!message || !state.loaded) return;
    
    // Add user message to history
    setState(prev => ({
      ...prev,
      history: [...prev.history, { sender: 'You', text: message }]
    }));
    
    setChatInput('');
    setShowThinking(true);
    
    try {
      const payload = {
        chat_id: state.chatId,
        message: message
      };
      
      const response = await fetch(`${API_URL}/chat?model=${state.selectedModel}&device=${state.computeMode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          history: [...prev.history, {
            sender: 'Bot',
            text: data.response,
            tokens: data.tokens,
            time_s: data.time_s,
            tps: data.tps
          }]
        }));
      } else {
        throw new Error(await response.text());
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        history: [...prev.history, {
          sender: 'Bot',
          text: `Error: ${(error as Error).message}`
        }]
      }));
    }
    
    setShowThinking(false);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" />
      )}

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`
          w-80 bg-gray-800 p-5 border-r border-gray-700 overflow-y-auto
          fixed md:relative z-50 h-full
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-5 overflow-hidden">
        {/* Mobile Header with Hamburger */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <button
            id="hamburger-button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-700 rounded-md"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-2xl">🦜🔗 LLM Chat</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Desktop Header */}
        <div className="text-center mb-8 hidden md:block">
          <h1 className="text-4xl flex items-center justify-center gap-3">
            🦜🔗 LLM Chat
          </h1>
        </div>

        {!state.chatId ? (
          <div className="bg-blue-900 border border-blue-400 rounded-md p-4 text-center">
            No conversation. Click ➕ New Chat to get started.
          </div>
        ) : (
           <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
            {/* Controls */}
            <div className="flex-none space-y-5 mb-5">
              <div>
                <label className="block mb-2 text-sm">Select model</label>
                <select
                  value={state.selectedModel}
                  onChange={(e) => setState(prev => ({ ...prev, selectedModel: e.target.value }))}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-sm"
                >
                  {state.models.length === 0 ? (
                    <option value="">Loading models...</option>
                  ) : (
                    state.models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm">Compute Mode</label>
                <select
                  value={state.computeMode}
                  onChange={(e) => setState(prev => ({ ...prev, computeMode: e.target.value }))}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-sm"
                >
                  <option value="auto">auto</option>
                  <option value="cpu">cpu</option>
                  <option value="gpu">gpu</option>
                </select>
              </div>

              <button
                onClick={toggleModel}
                disabled={state.processing}
                className="px-5 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm transition-colors"
              >
                {state.loaded ? 'Unload Model' : 'Load Model'}
              </button>

              <div className="text-sm space-y-1">
                <div><strong>Chat ID:</strong> <span className="break-all">{state.chatId}</span></div>
                <div><strong>Status:</strong> {state.loaded ? 'Loaded' : 'Not loaded'}</div>
              </div>
            </div>

            {state.loaded ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chat History */}
                <div ref={chatHistoryRef} className="flex-1 overflow-y-auto py-5 space-y-4 chat-scrollbar">
                  {state.history.map((entry, index) => (
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
                  {showThinking && (
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
                  )}
                </div>

                {/* Chat Input */}
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
              </div>
            ) : (
              <div className="bg-blue-900 border border-blue-400 rounded-md p-4 text-center">
                Please load a model before chatting.
              </div>
            )}
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
}