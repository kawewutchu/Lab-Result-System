export interface LabResult {
  id: string;
  created_at: string;
  birth_date: string;
  national_id: string;
  file_path: string;
  uploaded_by: string;
}

export interface User {
  id: string;
  email: string;
  role: 'staff' | 'admin';
}