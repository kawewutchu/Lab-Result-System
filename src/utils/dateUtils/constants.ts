// ค่าคงที่สำหรับการจัดการวันที่
export const DATE_CONSTANTS = {
  MIN_BE_YEAR: 2400,
  MAX_BE_YEAR: 2600,
  MONTHS_TH: [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]
} as const;

// ข้อความแสดงข้อผิดพลาด
export const DATE_ERROR_MESSAGES = {
  INVALID_FORMAT: 'รูปแบบวันที่ไม่ถูกต้อง กรุณากรอกในรูปแบบ วว/ดด/ปปปป',
  INVALID_BE_YEAR: `กรุณากรอกปี พ.ศ. ระหว่าง ${DATE_CONSTANTS.MIN_BE_YEAR}-${DATE_CONSTANTS.MAX_BE_YEAR}`,
  INVALID_DATE: 'วันที่ไม่ถูกต้อง',
  INVALID_MONTH: 'เดือนไม่ถูกต้อง',
  INVALID_DAY: 'วันที่ไม่ถูกต้อง'
} as const;