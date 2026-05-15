"use client";

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Layout, MoveUp, MoveDown } from 'lucide-react';
import { addGalleryItem, updateGalleryItem, deleteGalleryItem } from '@/app/actions';
import toast from 'react-hot-toast';

interface GalleryItem {
  id: string;
  image_url: string;
  thumb_url: string;
  span_class: string;
  order_index?: number;
}

interface GalleryManagerProps {
  galleryItems: GalleryItem[];
}

export default function GalleryManager({ galleryItems: initialItems }: GalleryManagerProps) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<GalleryItem, 'id'>>({
    image_url: '',
    thumb_url: '',
    span_class: 'col-span-1 row-span-1'
  });

  const spanOptions = [
    { label: 'Normal (1x1)', value: 'col-span-1 row-span-1' },
    { label: 'Grande (2x2)', value: 'md:col-span-2 md:row-span-2' },
    { label: 'Horizontal (2x1)', value: 'md:col-span-2 md:row-span-1' },
    { label: 'Vertical (1x2)', value: 'md:col-span-1 md:row-span-2' },
  ];

  const handleAdd = async () => {
    if (!formData.image_url) {
      toast.error('La URL de la imagen es obligatoria');
      return;
    }
    setLoading('adding');
    const res = await addGalleryItem(formData);
    if (res.success) {
      toast.success('Imagen agregada');
      window.location.reload();
    } else {
      toast.error(res.error || 'Error al agregar');
      setLoading(null);
    }
  };

  const handleUpdate = async (id: string) => {
    setLoading(id);
    const res = await updateGalleryItem(id, formData);
    if (res.success) {
      toast.success('Imagen actualizada');
      window.location.reload();
    } else {
      toast.error(res.error || 'Error al actualizar');
      setLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta imagen?')) return;
    setLoading(id);
    const res = await deleteGalleryItem(id);
    if (res.success) {
      toast.success('Imagen eliminada');
      window.location.reload();
    } else {
      toast.error(res.error || 'Error al eliminar');
      setLoading(null);
    }
  };

  const startEdit = (item: GalleryItem) => {
    setEditingId(item.id);
    setFormData({
      image_url: item.image_url,
      thumb_url: item.thumb_url,
      span_class: item.span_class
    });
    setIsAdding(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-fsm-blue uppercase tracking-tighter">Galería de Fotos</h3>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ image_url: '', thumb_url: '', span_class: 'col-span-1 row-span-1' }); }}
          className="bg-fsm-blue text-white px-6 py-2 rounded-full font-black text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-fsm-red transition-all"
        >
          <Plus size={16} /> Agregar Foto
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-gray-50 p-8 rounded-[2rem] border-2 border-dashed border-gray-200 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-black text-fsm-blue uppercase text-xs tracking-widest">
              {isAdding ? 'Nueva Imagen' : 'Editar Imagen'}
            </h4>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-400 hover:text-fsm-red"><X size={20} /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={12} /> URL Imagen Full
              </label>
              <input 
                type="text" 
                value={formData.image_url}
                onChange={e => setFormData({...formData, image_url: e.target.value})}
                placeholder="https://..."
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fsm-red/20 transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={12} /> URL Miniatura (Opcional)
              </label>
              <input 
                type="text" 
                value={formData.thumb_url}
                onChange={e => setFormData({...formData, thumb_url: e.target.value})}
                placeholder="Si se deja vacío, se usará la imagen full"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fsm-red/20 transition-all font-medium"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Layout size={12} /> Tamaño en Cuadrícula (Bento)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {spanOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormData({...formData, span_class: opt.value})}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      formData.span_class === opt.value 
                        ? 'bg-fsm-blue text-white border-fsm-blue shadow-lg' 
                        : 'bg-white text-gray-500 border-gray-200 hover:border-fsm-red/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button 
              onClick={isAdding ? handleAdd : () => editingId && handleUpdate(editingId)}
              disabled={!!loading}
              className="bg-fsm-red text-white px-10 py-3 rounded-full font-black text-[10px] tracking-widest uppercase flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-fsm-red/20 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : <><Save size={16} /> Guardar Cambios</>}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <div key={item.id} className="group relative aspect-square rounded-3xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <img 
              src={item.thumb_url || item.image_url} 
              alt="Gallery item" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-fsm-blue/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
              <button 
                onClick={() => startEdit(item)}
                className="p-2 bg-white text-fsm-blue rounded-full hover:bg-fsm-red hover:text-white transition-all shadow-lg"
                title="Editar"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => handleDelete(item.id)}
                className="p-2 bg-white text-fsm-red rounded-full hover:bg-fsm-red hover:text-white transition-all shadow-lg"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="absolute bottom-2 left-2 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg">
               <span className="text-[8px] font-black text-white uppercase tracking-tighter">
                 {spanOptions.find(o => o.value === item.span_class)?.label.split(' ')[0]}
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
