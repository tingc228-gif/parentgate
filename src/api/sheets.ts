import type { Message, NewMessage, SchoolEvent, NewEvent } from '../types';

const GAS_URL = import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbz-VlrBGn0wG_GpypReFt_lHPGzMfJHsN2vvCQ9DJWGn_a4FLmBFO0zYbyQcO_PQbIO/exec';
const API_KEY = import.meta.env.VITE_API_KEY || 'pg_1307e0638a6cda776201252d5f655e0c96b1e47d';

async function gasGet<T>(action: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('key', API_KEY);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url.toString(), { redirect: 'follow' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function gasPost<T>(action: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ action, key: API_KEY, ...data }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Messages
export async function getMessages(month?: string): Promise<Message[]> {
  const params = month ? { month } : undefined;
  const result = await gasGet<{ messages: Message[] }>('getMessages', params);
  return result.messages;
}

export async function getMessage(id: number): Promise<{ message: Message; events: SchoolEvent[] }> {
  const result = await gasGet<{ message: Message; events: SchoolEvent[] }>('getMessage', { id: String(id) });
  return result;
}

export async function addMessage(message: NewMessage): Promise<{ id: number }> {
  return gasPost('addMessage', message as unknown as Record<string, unknown>);
}

export async function updateMessage(message: Message): Promise<void> {
  await gasPost('updateMessage', message as unknown as Record<string, unknown>);
}

export async function deleteMessage(id: number): Promise<void> {
  await gasPost('deleteMessage', { id });
}

// File upload
export async function uploadFile(base64: string, filename: string, mimeType: string): Promise<{ fileUrl: string }> {
  return gasPost('uploadFile', { base64, filename, mimeType });
}

// Events
export async function getEvents(params?: { month?: string; upcoming?: boolean }): Promise<SchoolEvent[]> {
  const p: Record<string, string> = {};
  if (params?.month) p.month = params.month;
  if (params?.upcoming) p.upcoming = 'true';
  const result = await gasGet<{ events: SchoolEvent[] }>('getEvents', p);
  return result.events;
}

export async function addEvent(event: NewEvent): Promise<{ id: number }> {
  return gasPost('addEvent', event as unknown as Record<string, unknown>);
}

export async function updateEvent(event: SchoolEvent): Promise<void> {
  await gasPost('updateEvent', event as unknown as Record<string, unknown>);
}

export async function deleteEvent(id: number): Promise<void> {
  await gasPost('deleteEvent', { id });
}

export async function toggleEventDone(id: number): Promise<void> {
  await gasPost('toggleEventDone', { id });
}

export async function syncToCalendar(eventId: number): Promise<{ gcalEventId: string }> {
  return gasPost('syncToCalendar', { eventId });
}
