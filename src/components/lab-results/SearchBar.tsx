import React from 'react';
import { Search } from '../icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      <input
        type="text"
        placeholder="ค้นหาด้วยเลขบัตรประชาชน"
        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}