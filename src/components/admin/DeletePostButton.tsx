'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface DeletePostButtonProps {
  id: string;
  onDelete: (formData: FormData) => Promise<void>;
}

export default function DeletePostButton({ id, onDelete }: DeletePostButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleAction(formData: FormData) {
    if (!confirm('¿Estás seguro de que quieres eliminar este artículo? Esta acción no se puede deshacer.')) {
      return;
    }
    setIsDeleting(true);
    await onDelete(formData);
    // Note: Revalidation will happen on the server and trigger a refresh
  }

  return (
    <form action={handleAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        disabled={isDeleting}
        className="p-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
        title="Eliminar"
      >
        <Trash2 size={20} className={isDeleting ? "animate-pulse" : ""} />
      </button>
    </form>
  );
}
