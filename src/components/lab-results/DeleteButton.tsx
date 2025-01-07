import React, { useState } from 'react';
import { Trash2 } from '../icons';
import { deleteLabResult } from '../../services/labResults';

interface DeleteButtonProps {
  id: string;
  filePath: string;
  onDelete?: () => void;
}

export default function DeleteButton({ id, filePath, onDelete }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteLabResult(id, filePath);
      onDelete?.();
    } catch (error) {
      console.error('Error deleting result:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-800 disabled:text-red-300 disabled:cursor-not-allowed"
      aria-label="ลบผลแล็บ"
    >
      <Trash2 
        size={20} 
        className={isDeleting ? 'animate-pulse' : ''} 
      />
    </button>
  );
}