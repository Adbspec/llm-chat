// HTTP wrapper methods for our FastAPI backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Chat { chat_id: string; title?: string; model?: string; device?: string; }
export interface Message { sender: string; text: string; timestamp: string; tokens?: number; time_s?: number; tps?: number; }

export async function fetchModels(): Promise<string[]> {
  const res = await fetch(`${API_URL}/models`);
  if (!res.ok) throw new Error('Failed to load models');
  return res.json();
}

export async function fetchChats(): Promise<Chat[]> {
  const res = await fetch(`${API_URL}/chats`);
  if (!res.ok) throw new Error('Failed to load chats');
  return res.json();
}

export async function fetchHistory(chatId: string): Promise<Message[]> {
  const res = await fetch(`${API_URL}/history?chat_id=${chatId}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function fetchStatus(chatId: string): Promise<{model?:string; device?:string; loaded:boolean;}> {
  const res = await fetch(`${API_URL}/status?chat_id=${chatId}`);
  if (!res.ok) throw new Error('Failed to load status');
  return res.json();
}

export async function postLoadModel(chatId: string, model: string, device: string) {
  return fetch(`${API_URL}/load`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({chat_id:chatId, model, device}) });
}

export async function postUnloadModel(chatId: string, model: string, device: string) {
  return fetch(`${API_URL}/unload`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({chat_id:chatId, model, device}) });
}

export async function postChat(chatId: string, model: string, device: string, message: string) {
  const res = await fetch(`${API_URL}/chat?model=${model}&device=${device}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({chat_id:chatId, message})
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}