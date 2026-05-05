"use client";

import React, { useState } from 'react';
import { updateContent } from '@/app/actions';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';

interface HomePageFormProps {
  initialContent: Record<string, string>;
}

export const homePageFields = [
  { group: 'Hero Section', key: 'home_hero_subtitle', label: 'Subtítulo', type: 'text', default: 'Excelencia en Educación Superior' },
  { group: 'Hero Section', key: 'home_hero_title1', label: 'Título Línea 1', type: 'text', default: 'FORJANDO' },
  { group: 'Hero Section', key: 'home_hero_title_highlight', label: 'Título Resaltado', type: 'text', default: 'FUTUROS' },
  { group: 'Hero Section', key: 'home_hero_title2', label: 'Título Línea 3', type: 'text', default: 'BRILLANTES' },
  { group: 'Hero Section', key: 'home_hero_desc', label: 'Descripción', type: 'textarea', default: 'Institución de educación para el trabajo y desarrollo humano en Soacha, comprometida con la formación integral y la calidad técnica.' },
  { group: 'Hero Section', key: 'home_hero_image', label: 'URL Imagen Hero', type: 'text', default: '/img/servicio-al-cliente.jpg' },
  
  { group: 'Sección Programas', key: 'home_programs_subtitle', label: 'Subtítulo Programas', type: 'text', default: 'Oferta Programática' },
  { group: 'Sección Programas', key: 'home_programs_title', label: 'Título Programas', type: 'text', default: 'Elige tu camino hacia la Excelencia' },
  
  { group: 'Sección Certificaciones', key: 'home_cert_title', label: 'Título Certificaciones', type: 'text', default: 'Excelencia Acreditada' },
  { group: 'Sección Certificaciones', key: 'home_cert_desc', label: 'Descripción Certificaciones', type: 'textarea', default: 'Nuestra dedicación a la calidad educativa está avalada por certificaciones rigurosas y por la preferencia de nuestra comunidad, consolidándonos como líderes en formación técnica integral.' },
];

export default function HomePageForm({ initialContent }: HomePageFormProps) {
  const [content, setContent] = useState(initialContent);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setSavingKey(key);
    setSuccessKey(null);
    try {
      // Usar un nuevo action que hace upsert
      await updateContent(key, content[key] || '');
      setSuccessKey(key);
      setTimeout(() => setSuccessKey(null), 3000);
    } catch (e) {
      console.error(e);
      alert('Error guardando el contenido.');
    } finally {
      setSavingKey(null);
    }
  };

  // Agrupar campos
  const groups = homePageFields.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = [];
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, typeof homePageFields>);

  return (
    <div className="space-y-12">
      {Object.entries(groups).map(([groupName, fields]) => (
        <div key={groupName} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-fsm-blue mb-8 uppercase tracking-widest border-b pb-4">{groupName}</h2>
          
          <div className="space-y-8">
            {fields.map(field => (
              <div key={field.key} className="flex flex-col md:flex-row md:items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="md:w-1/4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{field.label}</label>
                  <code className="text-[9px] text-gray-400 font-mono">{field.key}</code>
                </div>
                
                <div className="md:w-2/4 flex-grow">
                  {field.type === 'textarea' ? (
                    <textarea 
                      value={content[field.key] ?? field.default}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-4 outline-none focus:border-fsm-blue min-h-[100px] text-sm font-medium"
                    />
                  ) : (
                    <input 
                      type="text"
                      value={content[field.key] ?? field.default}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-4 outline-none focus:border-fsm-blue text-sm font-medium"
                    />
                  )}
                </div>
                
                <div className="md:w-1/4 flex justify-end">
                  <button 
                    onClick={() => handleSave(field.key)}
                    disabled={savingKey === field.key}
                    className="flex items-center gap-2 bg-fsm-blue text-white px-6 py-3 rounded-full text-xs font-black tracking-widest hover:bg-fsm-red transition-all disabled:opacity-50"
                  >
                    {savingKey === field.key ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : successKey === field.key ? (
                      <CheckCircle2 size={16} className="text-green-400" />
                    ) : (
                      <Save size={16} />
                    )}
                    GUARDAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
