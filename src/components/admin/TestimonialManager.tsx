"use client";

import React, { useState } from 'react';
import { updateTestimonial, addTestimonial, deleteTestimonial } from '@/app/actions';
import { Plus, Trash2, Save, User, Quote, Loader2, CheckCircle, GraduationCap } from 'lucide-react';

interface Testimonial {
  id: string;
  text: string;
  author: string;
  role: string;
}

interface TestimonialManagerProps {
  initialTestimonials: Testimonial[];
}

export default function TestimonialManager({ initialTestimonials }: TestimonialManagerProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({ text: '', author: '', role: '' });

  const handleUpdate = async (id: string, field: keyof Testimonial, value: string) => {
    const updated = testimonials.map(t => t.id === id ? { ...t, [field]: value } : t);
    setTestimonials(updated);
  };

  const saveUpdate = async (id: string) => {
    const testimonial = testimonials.find(t => t.id === id);
    if (!testimonial) return;

    setLoading(prev => ({ ...prev, [id]: true }));
    const res = await updateTestimonial(id, { text: testimonial.text, author: testimonial.author, role: testimonial.role });
    
    if (res.success) {
      setSuccess(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setSuccess(prev => ({ ...prev, [id]: false })), 3000);
    } else {
      alert("Error al guardar");
    }
    setLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleAdd = async () => {
    if (!newTestimonial.text || !newTestimonial.author) {
      alert("Texto y Autor son obligatorios");
      return;
    }

    setIsAdding(true);
    const res = await addTestimonial(newTestimonial);
    if (res.success) {
      window.location.reload(); // Simplest way to refresh the list
    } else {
      alert("Error al añadir");
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este testimonio?")) return;

    const res = await deleteTestimonial(id);
    if (res.success) {
      setTestimonials(prev => prev.filter(t => t.id !== id));
    } else {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">Gestor de Testimonios</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Administra las voces de tus egresados</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-fsm-red text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 font-black text-xs tracking-widest uppercase"
        >
          {isAdding ? "Cancelar" : <><Plus size={18} /> Nuevo Testimonio</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[2rem] shadow-premium border-2 border-fsm-red/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <h3 className="text-fsm-red font-black uppercase text-sm mb-6 flex items-center gap-2">
            <Plus size={16} /> Crear Nuevo Testimonio
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Nombre del Egresado</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Ej: Juan Pérez"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                  value={newTestimonial.author}
                  onChange={e => setNewTestimonial({...newTestimonial, author: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Cargo / Título</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Ej: Egresado de Enfermería"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                  value={newTestimonial.role}
                  onChange={e => setNewTestimonial({...newTestimonial, role: e.target.value})}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 mb-6">
            <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Testimonio (Cita)</label>
            <div className="relative">
              <Quote className="absolute left-4 top-4 text-gray-400" size={16} />
              <textarea 
                placeholder="Escribe aquí el testimonio..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm min-h-[120px]"
                value={newTestimonial.text}
                onChange={e => setNewTestimonial({...newTestimonial, text: e.target.value})}
              />
            </div>
          </div>
          <button 
            onClick={handleAdd}
            disabled={isAdding && loading['new']}
            className="w-full bg-fsm-blue text-white py-4 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-fsm-red transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            {isAdding && loading['new'] ? <Loader2 size={18} className="animate-spin" /> : "Guardar y Publicar"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {testimonials.map((t) => (
          <div key={t.id} className="bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-blue/20 transition-all group">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-fsm-blue focus:ring-2 focus:ring-fsm-blue outline-none"
                    value={t.author}
                    onChange={e => handleUpdate(t.id, 'author', e.target.value)}
                  />
                  <input 
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-gray-500 focus:ring-2 focus:ring-fsm-blue outline-none"
                    value={t.role}
                    onChange={e => handleUpdate(t.id, 'role', e.target.value)}
                  />
                </div>
                <textarea 
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-medium text-sm text-gray-700 min-h-[100px] focus:ring-2 focus:ring-fsm-blue outline-none italic"
                  value={t.text}
                  onChange={e => handleUpdate(t.id, 'text', e.target.value)}
                />
              </div>
              <div className="flex md:flex-col gap-2 justify-center items-center px-4 border-l border-gray-50">
                <button 
                  onClick={() => saveUpdate(t.id)}
                  className="p-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                  title="Guardar Cambios"
                >
                  {loading[t.id] ? <Loader2 className="animate-spin" /> : success[t.id] ? <CheckCircle /> : <Save />}
                </button>
                <button 
                  onClick={() => handleDelete(t.id)}
                  className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
