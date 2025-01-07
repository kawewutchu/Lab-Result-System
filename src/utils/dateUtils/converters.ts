import { DATE_CONSTANTS, DATE_ERROR_MESSAGES } from './constants';
import { isBuddhistYear } from './validators';

export function validateDateParts(day: number, month: number, year: number): void {
  if (!isBuddhistYear(year)) {
    throw new Error(DATE_ERROR_MESSAGES.INVALID_BE_YEAR);
  }

  if (month < 1 || month > 12) {
    throw new Error(DATE_ERROR_MESSAGES.INVALID_MONTH);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    throw new Error(DATE_ERROR_MESSAGES.INVALID_DAY);
  }
}

export function convertThaiDateFormat(input: string): string {
  if (!input) return '';
  
  const parts = input.split('/');
  if (parts.length !== 3) {
    throw new Error(DATE_ERROR_MESSAGES.INVALID_FORMAT);
  }

  const [day, month, year] = parts.map(Number);
  validateDateParts(day, month, year);

  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}