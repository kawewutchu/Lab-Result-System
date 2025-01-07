import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload } from './icons';
import DateInput from './DateInput';
import NationalIdInput from './NationalIdInput';

function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      setSuccess(false);

      const fileExt = file.name.split('.').pop();
      const fileName = `${nationalId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lab-results')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('lab_results')
        .insert([
          {
            national_id: nationalId,
            birth_date: birthDate,
            file_path: filePath
          }
        ]);

      if (dbError) throw dbError;

      setSuccess(true);
      setFile(null);
      setNationalId('');
      setBirthDate('');
    } catch (err) {
      console.error('Upload error:', err);
      setError('เกิดข้อผิดพลาดในการอัพโหลด');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">อัพโหลดผลแล็บ</h1>
          <p className="mt-2 text-gray-600">กรอกข้อมูลและอัพโหลดไฟล์ผลแล็บ</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <NationalIdInput
            value={nationalId}
            onChange={setNationalId}
            required
          />

          <DateInput
            value={birthDate}
            onChange={setBirthDate}
            label="วันเดือนปีเกิด"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ไฟล์ผลแล็บ
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>อัพโหลดไฟล์</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".pdf"
                      className="sr-only"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PDF เท่านั้น</p>
                {file && (
                  <p className="text-sm text-gray-600">
                    ไฟล์ที่เลือก: {file.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center">
              อัพโหลดสำเร็จ
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors"
          >
            {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลด'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UploadForm;