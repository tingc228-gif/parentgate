export interface Message {
  rowIndex: number;
  id: number;
  title: string;
  source: string;
  receivedAt: string;
  notes: string;
  fileUrls: string;
  fileNames: string;
  createdAt: string;
}

export interface NewMessage {
  title: string;
  source: string;
  receivedAt: string;
  notes: string;
  fileUrls: string;
  fileNames: string;
}

export interface SchoolEvent {
  rowIndex: number;
  id: number;
  messageId: number | '';
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  endDate: string;
  endTime: string;
  location: string;
  category: string;
  gcalEventId: string;
  isDone: number;
  createdAt: string;
}

export interface NewEvent {
  messageId: number | '';
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  endDate: string;
  endTime: string;
  location: string;
  category: string;
}

export const EVENT_CATEGORIES = [
  { name: '学校活动', emoji: '🏫' },
  { name: '假期', emoji: '🌴' },
  { name: '考试', emoji: '📝' },
  { name: '缴费', emoji: '💰' },
  { name: '其他', emoji: '📌' },
] as const;
