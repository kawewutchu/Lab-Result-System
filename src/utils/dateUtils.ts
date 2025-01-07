import { parse, format } from 'date-fns';
import { th } from 'date-fns/locale';

// แปลงวันที่จาก input (yyyy-MM-dd) เป็น ISO string โดยเก็บเป็นปี พ.ศ.
export function convertInputDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  
  // แยกวันที่เป็นส่วนๆ และคงค่าปี พ.ศ. ไว้
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // สร้างวันที่ในรูปแบบ YYYY-MM-DD โดยใช้ปี พ.ศ.
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// แสดงวันที่ในรูปแบบไทย
export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return '';
  
  // สร้าง Date object โดยใช้ปี พ.ศ.
  const date = new Date(year, month - 1, day);
  return format(date, 'dd MMMM yyyy', { locale: th });
}

// แปลงวันที่เป็นรูปแบบ input (yyyy-MM-dd)
export function formatInputDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const [year, month, day] = dateStr.split('-');
  return `${year}-${month}-${day}`;
}