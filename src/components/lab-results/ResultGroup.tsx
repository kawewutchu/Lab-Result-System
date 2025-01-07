import React from 'react';
import { LabResult } from '../../types';
import ResultItem from './ResultItem';

interface ResultGroupProps {
  results: LabResult[];
  onDelete?: () => void;
}

function ResultGroup({ results, onDelete }: ResultGroupProps) {
  return (
    <div className="space-y-4">
      {results.map((result) => (
        <ResultItem 
          key={result.id} 
          result={result}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default ResultGroup;