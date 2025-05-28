import { useState, useEffect } from 'react';
import * as api from '@/lib/api';

export function useModels() {
  const [models, setModels] = useState<string[]>([]);
  useEffect(() => { api.fetchModels().then(setModels).catch(console.error); }, []);
  return models;
}

export function useChats() {
  const [chats, setChats] = useState<api.Chat[]>([]);
  useEffect(() => { api.fetchChats().then(setChats).catch(console.error); }, []);
  return chats;
}

export function useHistory(chatId: string | null) {
  const [history, setHistory] = useState<api.Message[]>([]);
  useEffect(() => {
    if (chatId) api.fetchHistory(chatId).then(setHistory).catch(console.error);
  }, [chatId]);
  return history;
}

export function useStatus(chatId: string | null) {
  const [status, setStatus] = useState<{model:string;device:string;loaded:boolean}>({model:'',device:'auto',loaded:false});
  useEffect(() => {
    if (chatId) api.fetchStatus(chatId).then(s => setStatus({
      model: s.model||'', device: s.device||'auto', loaded: s.loaded
    })).catch(console.error);
  }, [chatId]);
  return status;
}