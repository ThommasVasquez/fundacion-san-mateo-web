'use client';

import React, { useState } from 'react';
import { updateContent } from '@/app/actions';
import { Save, Image as ImageIcon, FileText, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { uploadImage } from '@/lib/imageUpload';

interface ContentItem {
  id: string;
  content_key: string;
  content_type: string;
  value: string;
  page_path: string;
  updated_at: string;
}

export default function ContentEditor({ initialData }: { initialData: ContentItem[] }) {
  const [data, setData] = useState<ContentItem[]>(initialData);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});

  // Group by page
  const groupedTasks = data.reduce((acc, item) => {
    if (!acc[item.page_path]) acc[item.page_path] = [];
    acc[item.page_path].push(item);
    return acc;
  }, {} as Record<string, ContentItem[]>);

  const handleUpdate = async (item: ContentItem, newValue: string) => {
    setLoadingMap(prev => ({ ...prev, [item.content_key]: true }));
    setSuccessMap(prev => ({ ...prev, [item.content_key]: false }));
    
    // Server action
    const res = await updateContent(item.content_key, newValue);
    
    if (res?.success) {
      setData(prev => prev.map(d => d.id === item.id ? { ...d, value: newValue } : d));
      setSuccessMap(prev => ({ ...prev, [item.content_key]: true }));
      setTimeout(() => setSuccessMap(prev => ({ ...prev, [item.content_key]: false })), 3000);
    } else {
      alert("Error al actualizar");
    }
    
    setLoadingMap(prev => ({ ...prev, [item.content_key]: false }));
  };

  const handleImageUpload = async (item: ContentItem, file: File) => {
    setLoadingMap(prev => ({ ...prev, [item.content_key]: true }));
    
    try {
      const publicUrl = await uploadImage(file);
      await handleUpdate(item, publicUrl);
    } catch (e: any) {
      alert("Error al subir la imagen: " + (e?.message || "Error desconocido"));
      setLoadingMap(prev => ({ ...prev, [item.content_key]: false }));
    }
  };

  return (
    <div className="space-y-12">
      {Object.entries(groupedTasks).map(([path, items]) => (
        <div key={path} className="bg-white p-8 rounded-[2rem] shadow-premium border border-gray-100">
          <h2 className="text-2xl font-black text-fsm-blue mb-6 pb-4 border-b border-gray-100">
            Ruta: <span className="text-fsm-red">{path}</span>
          </h2>
          
          <div className="space-y-6">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-colors">
                
                <div className="md:col-span-3 flex flex-col justify-start">
                  <div className="flex items-center gap-2 mb-1">
                    {item.content_type === 'image' ? <ImageIcon size={16} className="text-fsm-red" /> : <FileText size={16} className="text-fsm-blue" />}
                    <span className="font-bold text-gray-700 text-sm">{item.content_key}</span>
                  </div>
                  <span className="text-xs text-gray-700 uppercase tracking-widest">{item.content_type}</span>
                </div>

                <div className="md:col-span-7">
                    {item.content_type === 'text' ? (
                      <textarea 
                        defaultValue={item.value}
                        className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-fsm-red outline-none min-h-[100px]"
                        onBlur={(e) => {
                          if(e.target.value !== item.value) {
                             handleUpdate(item, e.target.value);
                          }
                        }}
                      />
                    ) : item.content_type === 'toggle' ? (
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleUpdate(item, item.value === 'true' ? 'false' : 'true')}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-fsm-red focus:ring-offset-2 ${item.value === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span 
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${item.value === 'true' ? 'translate-x-7' : 'translate-x-1'}`}
                          />
                        </button>
                        <span className="text-sm font-bold text-gray-700 uppercase">{item.value === 'true' ? 'Activado' : 'Desactivado'}</span>
                      </div>
                    ) : (
                    <div className="flex flex-col gap-4">
                      {item.value && !item.value.startsWith('data:image/') && (
                        <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-200">
                           <Image src={item.value} alt={item.content_key} fill className="object-cover" />
                        </div>
                      )}
                      <label className="cursor-pointer bg-fsm-blue text-white px-4 py-2 rounded-xl text-xs font-bold text-center hover:bg-fsm-red transition-all">
                         Cambiar Imagen
                         <input 
                           type="file" 
                           accept="image/*"
                           className="hidden" 
                           onChange={(e) => {
                             if(e.target.files && e.target.files[0]) {
                               handleImageUpload(item, e.target.files[0]);
                             }
                           }}
                         />
                      </label>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 flex items-center justify-end h-full">
                   {loadingMap[item.content_key] && <span className="text-sm font-bold text-fsm-blue animate-pulse">Guardando...</span>}
                   {successMap[item.content_key] && <CheckCircle size={24} className="text-green-500" />}
                </div>

              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
