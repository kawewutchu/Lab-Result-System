import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LabResult } from '../../types';
import SearchBar from './SearchBar';
import ResultsTable from './ResultsTable';
import Pagination from '../Pagination';
import { formatThaiDate } from '../../utils/dateUtils';

const ITEMS_PER_PAGE = 10;

export default function ResultsList() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchResults();
  }, [currentPage, searchTerm]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('lab_results')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('national_id', `%${searchTerm}%`);
      }

      const { count } = await query.select('*', { count: 'exact', head: true });
      setTotalCount(count || 0);

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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">รายการผลแล็บทั้งหมด</h2>
          <div className="w-72">
            <SearchBar 
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลด...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'ไม่พบผลการค้นหา' : 'ไม่มีรายการผลแล็บ'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <ResultsTable 
              results={results}
              onDelete={fetchResults}
            />
          </div>
        )}

        {totalCount > ITEMS_PER_PAGE && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}