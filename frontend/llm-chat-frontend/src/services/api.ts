const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchModels() {
  const res = await fetch(`${API_URL}/models`);
  if (!res.ok) throw new Error('Failed to load models');
  return res.json();
}

export async function fetchChats() {
  const res = await fetch(`${API_URL}/chats`);
  if (!res.ok) throw new Error('Failed to load chats');
  return res.json();
}

export async function fetchHistory(chatId: string) {
  const res = await fetch(`${API_URL}/history?chat_id=${chatId}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function fetchStatus(chatId: string) {
  const res = await fetch(`${API_URL}/status?chat_id=${chatId}`);
  if (!res.ok) throw new Error('Failed to load status');
  return res.json();
}

export async function loadModel(chatId: string, model: string, device: string) {
  const res = await fetch(`${API_URL}/load`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chatId, model, device })
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function unloadModel(chatId: string, model: string, device: string) {
  const res = await fetch(`${API_URL}/unload`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chatId, model, device })
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function sendChatRequest(chatId: string, message: string, model: string, device: string) {
  const res = await fetch(`${API_URL}/chat?model=${model}&device=${device}`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chatId, message })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

