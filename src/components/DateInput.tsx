import React, { useState, useEffect } from 'react';
import { Calendar } from './icons';
import { convertThaiDateFormat } from '../utils/dateUtils/converters';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

export default function DateInput({ value, onChange, label = 'วันที่', required = false }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!value) {
      setDisplayValue('');
      return;
    }
    const [year, month, day] = value.split('-');
    setDisplayValue(`${day}/${month}/${year}`);
  }, [value]);

  const formatInput = (input: string) => {
    // Remove any non-digit characters
    const numbers = input.replace(/\D/g, '');
    
    // Add slashes automatically
    let formatted = numbers;
    if (numbers.length > 4) {
      formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    } else if (numbers.length > 2) {
      formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    }
    
    return formatted;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatInput(input);
    setDisplayValue(formatted);
    setError('');

    if (!formatted) {
      onChange('');
      return;
    }

    // Only try to convert if we have a complete date (DD/MM/YYYY)
    if (formatted.length === 10) {
      try {
        const isoDate = convertThaiDateFormat(formatted);
        onChange(isoDate);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'รูปแบบวันที่ไม่ถูกต้อง');
      }
    }
  };

  return (
    <div>
      <label className="block text-base font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder="วว/ดด/ปปปป"
          maxLength={10}
          required={required}
          className={`
            pl-12 pr-4 py-3.5 w-full text-lg
            border-2 rounded-lg shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors
            ${error ? 'border-red-300' : 'border-gray-300'}
            placeholder:text-gray-400
          `}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}