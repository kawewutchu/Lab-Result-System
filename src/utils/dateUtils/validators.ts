import { DATE_CONSTANTS } from './constants';

export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function isBuddhistYear(year: number): boolean {
  return year >= DATE_CONSTANTS.MIN_BE_YEAR && year <= DATE_CONSTANTS.MAX_BE_YEAR;
}

export function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  
  if (!year || !month || !day) return false;
  if (!isBuddhistYear(year)) return false;
  
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}