import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LabResult } from '../types';
import { FileText, Trash2, Search } from 'lucide-react';
import Pagination from './Pagination';
import { formatThaiDate } from '../utils/dateUtils';

const ITEMS_PER_PAGE = 10;

export default function ResultsList() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [currentPage, searchTerm]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('lab_results')
        .select('*', { count: 'exact' });

      // Apply search filter if searchTerm exists
      if (searchTerm) {
        query = query.ilike('national_id', `%${searchTerm}%`);
      }

      // Get total count
      const { count } = await query.select('*', { count: 'exact', head: true });
      setTotalCount(count || 0);

      // Fetch paginated results
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      setDeleteLoading(id);
      
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('lab-results')
        .remove([filePath]);
      
      if (storageError) throw storageError;

      // Delete record from database
      const { error: dbError } = await supabase
        .from('lab_results')
        .delete()
        .eq('id', id);
      
      if (dbError) throw dbError;

      // Refresh results
      await fetchResults();
    } catch (error) {
      console.error('Error deleting result:', error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">รายการผลแล็บทั้งหมด</h2>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="ค้นหาด้วยเลขบัตรประชาชน"
            className="w-full pl-10 pr-3 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">กำลังโหลด...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'ไม่พบผลการค้นหา' : 'ไม่มีรายการผลแล็บ'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  วันที่อัพโหลด
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  วันเดือนปีเกิด
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  เลขบัตรประชาชน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ดูผล
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ลบ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result) => (
                <tr key={result.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatThaiDate(result.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatThaiDate(result.birth_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {result.national_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => window.open(supabase.storage.from('lab-results').getPublicUrl(result.file_path).data.publicUrl)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FileText size={20} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(result.id, result.file_path)}
                      disabled={deleteLoading === result.id}
                      className="text-red-600 hover:text-red-800 disabled:text-red-300 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={20} className={deleteLoading === result.id ? 'animate-pulse' : ''} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalCount > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  );
}