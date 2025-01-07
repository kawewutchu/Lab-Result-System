import React, { useState } from 'react';
import { CreditCard } from './icons';

interface NationalIdInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

export default function NationalIdInput({ 
  value, 
  onChange, 
  label = 'เลขบัตรประชาชน',
  required = false 
}: NationalIdInputProps) {
  const [error, setError] = useState('');

  const formatInput = (input: string) => {
    const numbers = input.replace(/\D/g, '');
    
    if (numbers.length <= 13) {
      let formatted = numbers;
      if (numbers.length > 1) formatted = numbers.slice(0, 1) + '-' + numbers.slice(1);
      if (numbers.length > 5) formatted = formatted.slice(0, 6) + '-' + formatted.slice(6);
      if (numbers.length > 10) formatted = formatted.slice(0, 12) + '-' + formatted.slice(12);
      if (numbers.length > 12) formatted = formatted.slice(0, 15) + '-' + formatted.slice(15);
      return formatted;
    }
    return numbers.slice(0, 13);
  };

  const validateNationalId = (id: string) => {
    const numbers = id.replace(/\D/g, '');
    if (numbers.length !== 13) {
      return 'เลขบัตรประชาชนต้องมี 13 หลัก';
    }
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(numbers[i]) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    
    if (parseInt(numbers[12]) !== checkDigit) {
      return 'เลขบัตรประชาชนไม่ถูกต้อง';
    }
    
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatInput(input);
    const numbers = formatted.replace(/\D/g, '');
    
    onChange(numbers);
    
    if (numbers.length === 13) {
      const validationError = validateNationalId(numbers);
      setError(validationError);
    } else {
      setError('');
    }
  };

  const displayValue = formatInput(value);

  return (
    <div>
      <label className="block text-base font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder="X-XXXX-XXXXX-XX-X"
          maxLength={17}
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