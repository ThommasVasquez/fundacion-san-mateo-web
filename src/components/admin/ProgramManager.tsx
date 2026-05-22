"use client";

import React, { useState } from 'react';
import { updateProgram, addProgram, deleteProgram } from '@/app/actions';
import { Plus, Trash2, Save, GraduationCap, Link as LinkIcon, Image as ImageIcon, FileText, Loader2, CheckCircle, Star } from 'lucide-react';
import { compressImageToBase64 } from '@/lib/imageUpload';

interface Program {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  href: string;
  category: string;
  is_featured: boolean;
}

interface ProgramManagerProps {
  initialPrograms: Program[];
}

export default function ProgramManager({ initialPrograms }: ProgramManagerProps) {
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newProgram, setNewProgram] = useState({ 
    title: '', 
    subtitle: '', 
    description: '', 
    image_url: '', 
    href: '', 
    category: 'tecnicos',
    is_featured: false
  });

  const handleUpdate = async (id: string, field: keyof Program, value: any) => {
    const updated = programs.map(p => p.id === id ? { ...p, [field]: value } : p);
    setPrograms(updated);
  };

  const saveUpdate = async (id: string) => {
    const program = programs.find(p => p.id === id);
    if (!program) return;

    setLoading(prev => ({ ...prev, [id]: true }));
    const res = await updateProgram(id, { 
      title: program.title, 
      subtitle: program.subtitle || '', 
      description: program.description || '', 
      image_url: program.image_url, 
      href: program.href, 
      category: program.category,
      is_featured: program.is_featured
    });
    
    if (res.success) {
      setSuccess(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setSuccess(prev => ({ ...prev, [id]: false })), 3000);
    } else {
      alert("Error al guardar");
    }
    setLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleAdd = async () => {
    if (!newProgram.title || !newProgram.image_url || !newProgram.href) {
      alert("Título, Imagen y Enlace son obligatorios");
      return;
    }

    setIsAdding(true);
    const res = await addProgram(newProgram);
    if (res.success) {
      window.location.reload();
    } else {
      alert("Error al añadir");
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este programa académico?")) return;

    const res = await deleteProgram(id);
    if (res.success) {
      setPrograms(prev => prev.filter(p => p.id !== id));
    } else {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">Gestor de Oferta Académica</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Administra programas técnicos y educación continua</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-fsm-red text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 font-black text-xs tracking-widest uppercase"
        >
          {isAdding ? "Cancelar" : <><Plus size={18} /> Nuevo Programa</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[2rem] shadow-premium border-2 border-fsm-red/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <h3 className="text-fsm-red font-black uppercase text-sm mb-6 flex items-center gap-2">
            <Plus size={16} /> Crear Nuevo Programa Académico
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Título del Programa</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Ej: Auxiliar de Enfermería"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                  value={newProgram.title}
                  onChange={e => setNewProgram({...newProgram, title: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Subtítulo / Especialidad</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Ej: Excelencia en Salud"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                  value={newProgram.subtitle}
                  onChange={e => setNewProgram({...newProgram, subtitle: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Imagen</label>
              <div className="relative h-14 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden hover:border-fsm-red transition-all group">
                {newProgram.image_url ? (
                  <img src={newProgram.image_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-gray-500 group-hover:text-fsm-red flex items-center gap-2">
                    <ImageIcon size={16} /> Subir Imagen
                  </span>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const base64 = await compressImageToBase64(file);
                        setNewProgram({...newProgram, image_url: base64});
                      } catch (err) {
                        alert("Error procesando imagen");
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Enlace de Página</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Ej: /programa-enfermeria"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                  value={newProgram.href}
                  onChange={e => setNewProgram({...newProgram, href: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Categoría</label>
              <select 
                className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                value={newProgram.category}
                onChange={e => setNewProgram({...newProgram, category: e.target.value})}
              >
                <option value="tecnicos">Programas Técnicos</option>
                <option value="continua">Educación Continua</option>
              </select>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 h-[60px] self-end">
              <input 
                type="checkbox" 
                id="is_featured_new"
                className="w-5 h-5 rounded border-gray-300 text-fsm-red focus:ring-fsm-red"
                checked={newProgram.is_featured}
                onChange={e => setNewProgram({...newProgram, is_featured: e.target.checked})}
              />
              <label htmlFor="is_featured_new" className="text-[10px] font-black text-gray-700 uppercase tracking-widest cursor-pointer">Destacar en Inicio</label>
            </div>
          </div>
          <div className="space-y-2 mb-6">
            <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Descripción (Opcional)</label>
            <textarea 
              placeholder="Breve descripción del programa..."
              className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm min-h-[100px]"
              value={newProgram.description}
              onChange={e => setNewProgram({...newProgram, description: e.target.value})}
            />
          </div>
          <button 
            onClick={handleAdd}
            className="w-full bg-fsm-blue text-white py-4 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-fsm-red transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            "Guardar Programa"
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {programs.map((p) => (
          <div key={p.id} className="bg-white p-8 rounded-[3rem] shadow-premium border border-gray-100 hover:border-fsm-blue/20 transition-all group">
            <div className="flex flex-col xl:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Título</label>
                    <input 
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-fsm-blue focus:ring-2 focus:ring-fsm-blue outline-none"
                      value={p.title}
                      onChange={e => handleUpdate(p.id, 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Subtítulo</label>
                    <input 
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-gray-500 focus:ring-2 focus:ring-fsm-blue outline-none"
                      value={p.subtitle}
                      onChange={e => handleUpdate(p.id, 'subtitle', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Categoría</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-gray-700 focus:ring-2 focus:ring-fsm-blue outline-none"
                      value={p.category}
                      onChange={e => handleUpdate(p.id, 'category', e.target.value)}
                    >
                      <option value="tecnicos">Técnicos</option>
                      <option value="continua">Continua</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Imagen</label>
                    <div className="relative h-11 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden hover:border-fsm-blue transition-all cursor-pointer">
                      {p.image_url ? (
                        <img src={p.image_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500">Subir Imagen</span>
                      )}
                      <input 
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const base64 = await compressImageToBase64(file);
                              handleUpdate(p.id, 'image_url', base64);
                            } catch (err) {
                              alert("Error procesando imagen");
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Enlace (href)</label>
                    <input 
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-gray-500 focus:ring-2 focus:ring-fsm-blue outline-none"
                      value={p.href}
                      onChange={e => handleUpdate(p.id, 'href', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input 
                      type="checkbox" 
                      id={`featured-${p.id}`}
                      className="w-5 h-5 rounded border-gray-300 text-fsm-blue focus:ring-fsm-blue"
                      checked={p.is_featured}
                      onChange={e => handleUpdate(p.id, 'is_featured', e.target.checked)}
                    />
                    <label htmlFor={`featured-${p.id}`} className="text-[8px] font-black text-gray-700 uppercase tracking-widest cursor-pointer flex items-center gap-1">
                      Destacar <Star size={10} className={p.is_featured ? "fill-yellow-400 text-yellow-400" : ""} />
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Descripción</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-medium text-sm text-gray-700 min-h-[80px] focus:ring-2 focus:ring-fsm-blue outline-none"
                    value={p.description}
                    onChange={e => handleUpdate(p.id, 'description', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex xl:flex-col gap-3 justify-center items-center px-6 border-l border-gray-50">
                <button 
                  onClick={() => saveUpdate(p.id)}
                  className="p-4 rounded-2xl bg-green-50 text-green-600 hover:bg-green-100 transition-all active:scale-95 shadow-sm"
                >
                  {loading[p.id] ? <Loader2 className="animate-spin" /> : success[p.id] ? <CheckCircle /> : <Save />}
                </button>
                <button 
                  onClick={() => handleDelete(p.id)}
                  className="p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95 shadow-sm"
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
