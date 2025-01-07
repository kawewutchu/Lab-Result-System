import React from 'react';
import { LabResult } from '../../types';
import ResultItem from './ResultItem';

interface ResultsTableProps {
  results: LabResult[];
  onDelete: () => void;
}

export default function ResultsTable({ results, onDelete }: ResultsTableProps) {
  return (
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
          <ResultItem 
            key={result.id} 
            result={result}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  );
}