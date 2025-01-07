import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return format(date, 'd MMMM yyyy เวลา HH:mm น.', { locale: th });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}