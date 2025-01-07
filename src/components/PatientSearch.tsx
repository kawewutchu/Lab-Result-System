import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, ExternalLink } from './icons';
import DateInput from './DateInput';
import NationalIdInput from './NationalIdInput';
import { LabResult } from '../types';
import { isWebView } from '../utils/browserUtils';

function PatientSearch() {
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [results, setResults] = useState<LabResult[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResults([]);
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lab_results')
        .select('*')
        .eq('national_id', nationalId)
        .eq('birth_date', birthDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
      
      if (!data?.length) {
        setError('ไม่พบผลแล็บ');
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ค้นหาผลแล็บ</h1>
          <p className="mt-2 text-gray-600">กรอกข้อมูลเพื่อค้นหาผลแล็บของคุณ</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSearch} className="space-y-6">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  กำลังค้นหา...
                </div>
              ) : (
                'ค้นหา'
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 text-center text-red-600 bg-red-50 rounded-lg p-4">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">ผลการค้นหา</h2>
              {results.map((result) => (
                <div key={result.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      วันที่อัพโหลด: {new Date(result.created_at).toLocaleDateString('th-TH')}
                    </div>
                    <a
                      href={supabase.storage.from('lab-results').getPublicUrl(result.file_path).data.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <span className="mr-1">ดูผล</span>
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientSearch;