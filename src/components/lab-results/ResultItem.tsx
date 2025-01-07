import React from 'react';
import { FileText } from '../icons';
import { formatThaiDate } from '../../utils/dateUtils';
import { supabase } from '../../lib/supabase';
import { LabResult } from '../../types';
import DeleteButton from './DeleteButton';

interface ResultItemProps {
  result: LabResult;
  onDelete?: () => void;
}

export default function ResultItem({ result, onDelete }: ResultItemProps) {
  const fileUrl = supabase.storage
    .from('lab-results')
    .getPublicUrl(result.file_path)
    .data.publicUrl;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {formatThaiDate(result.created_at)}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {formatThaiDate(result.birth_date)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap font-medium">
        {result.national_id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() => window.open(fileUrl)}
          className="text-blue-600 hover:text-blue-800 transition-colors"
          aria-label="ดูผลแล็บ"
        >
          <FileText size={20} />
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <DeleteButton 
          id={result.id} 
          filePath={result.file_path}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}