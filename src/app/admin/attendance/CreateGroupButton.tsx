'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import CreateGroupModal from './CreateGroupModal';

interface CreateGroupButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  label?: string;
}

export default function CreateGroupButton({
  className = '',
  variant = 'primary',
  label = 'Crear Nuevo Curso',
}: CreateGroupButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const baseStyles = "px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer";
  const variants = {
    primary: "bg-fsm-blue hover:bg-fsm-red text-white",
    secondary: "bg-purple-700 hover:bg-purple-800 text-white",
    outline: "bg-white border border-gray-300 text-fsm-blue hover:bg-gray-50",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        title="Crear un nuevo curso oficial y autogenerar su calendario de clases"
      >
        <Plus size={16} />
        <span>{label}</span>
      </button>

      <CreateGroupModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
