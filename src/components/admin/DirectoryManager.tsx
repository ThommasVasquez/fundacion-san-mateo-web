"use client";

import React, { useState } from 'react';
import { updateDirectoryItem, addDirectoryItem, deleteDirectoryItem } from '@/app/actions';
import { Plus, Trash2, Save, Phone, User, Loader2, CheckCircle } from 'lucide-react';

interface DirectoryItem {
  id: string;
  title: string;
  phone: string;
}

interface DirectoryManagerProps {
  initialItems: DirectoryItem[];
}

export default function DirectoryManager({ initialItems }: DirectoryManagerProps) {
  const [items, setItems] = useState<DirectoryItem[]>(initialItems);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', phone: '' });

  const handleUpdate = async (id: string, field: keyof DirectoryItem, value: string) => {
    const updated = items.map(t => t.id === id ? { ...t, [field]: value } : t);
    setItems(updated);
  };

  const saveUpdate = async (id: string) => {
    const item = items.find(t => t.id === id);
    if (!item) return;

    setLoading(prev => ({ ...prev, [id]: true }));
    const res = await updateDirectoryItem(id, { title: item.title, phone: item.phone });
    
    if (res.success) {
      setSuccess(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setSuccess(prev => ({ ...prev, [id]: false })), 3000);
    } else {
      alert("Error al guardar");
    }
    setLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleAdd = async () => {
    if (!newItem.title || !newItem.phone) {
      alert("Área y Teléfono son obligatorios");
      return;
    }

    setIsAdding(true);
    const res = await addDirectoryItem(newItem);
    if (res.success) {
      window.location.reload();
    } else {
      alert("Error al añadir");
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta línea de atención?")) return;

    const res = await deleteDirectoryItem(id);
    if (res.success) {
      setItems(prev => prev.filter(t => t.id !== id));
    } else {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">Gestor de Directorio</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Administra las líneas de atención administrativa</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-fsm-red text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 font-black text-xs tracking-widest uppercase"
        >
          {isAdding ? "Cancelar" : <><Plus size={18} /> Nueva Línea</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[2rem] shadow-premium border-2 border-fsm-red/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <h3 className="text-fsm-red font-black uppercase text-sm mb-6 flex items-center gap-2">
            <Plus size={16} /> Crear Nueva Línea de Atención
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Nombre del Área</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Ej: Secretaría Académica"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                  value={newItem.title}
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Teléfono / Celular</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Ej: 318 000 0000"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                  value={newItem.phone}
                  onChange={e => setNewItem({...newItem, phone: e.target.value})}
                />
              </div>
            </div>
          </div>
          <button 
            onClick={handleAdd}
            className="w-full bg-fsm-blue text-white py-4 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-fsm-red transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            "Guardar y Publicar"
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {items.map((t) => (
          <div key={t.id} className="bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-blue/20 transition-all group">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Área</label>
                    <input 
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-fsm-blue focus:ring-2 focus:ring-fsm-blue outline-none"
                      value={t.title}
                      onChange={e => handleUpdate(t.id, 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Teléfono</label>
                    <input 
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-gray-500 focus:ring-2 focus:ring-fsm-blue outline-none"
                      value={t.phone}
                      onChange={e => handleUpdate(t.id, 'phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex md:flex-col gap-2 justify-center items-center px-4 border-l border-gray-50">
                <button 
                  onClick={() => saveUpdate(t.id)}
                  className="p-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                >
                  {loading[t.id] ? <Loader2 className="animate-spin" /> : success[t.id] ? <CheckCircle /> : <Save />}
                </button>
                <button 
                  onClick={() => handleDelete(t.id)}
                  className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
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
