import dayjs from 'dayjs';

export function formatDate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function formatDateCN(date: string): string {
  return dayjs(date).format('M月D日');
}

export function formatDateTimeCN(date: string, time?: string): string {
  if (time) {
    return dayjs(date).format('M月D日') + ' ' + time;
  }
  return dayjs(date).format('M月D日');
}

export function daysUntil(date: string): number {
  return dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
}

export function isToday(date: string): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

export function isTomorrow(date: string): boolean {
  return dayjs(date).isSame(dayjs().add(1, 'day'), 'day');
}

export function getCurrentMonth(): string {
  return dayjs().format('YYYY-MM');
}
