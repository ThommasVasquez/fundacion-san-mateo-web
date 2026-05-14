"use client";

import React, { useState } from 'react';
import { updateContent } from '@/app/actions';
import { Save, Image as ImageIcon, FileText, CheckCircle, Loader2, ChevronDown, FolderTree } from 'lucide-react';
import Image from 'next/image';

interface GlobalCMSFormProps {
  initialContent: Record<string, string>;
}

// Estructura Jerárquica del CMS
export const cmsStructure: Record<string, any> = {
  "Inicio": [
    { group: 'Hero Section', key: 'home_hero_subtitle', label: 'Subtítulo Superior', type: 'text', default: 'Excelencia en Educación Superior' },
    { group: 'Hero Section', key: 'home_hero_title1', label: 'Título Línea 1', type: 'text', default: 'FORJANDO' },
    { group: 'Hero Section', key: 'home_hero_title_highlight', label: 'Título Resaltado', type: 'text', default: 'FUTUROS' },
    { group: 'Hero Section', key: 'home_hero_title2', label: 'Título Línea 3', type: 'text', default: 'BRILLANTES' },
    { group: 'Hero Section', key: 'home_hero_desc', label: 'Descripción Principal', type: 'text', default: 'Institución de educación para el trabajo y desarrollo humano en Soacha, comprometida con la formación integral y la calidad técnica.' },
    { group: 'Hero Section', key: 'home_hero_image', label: 'Imagen Hero', type: 'image', default: '/img/servicio-al-cliente.jpg' },
    { group: 'Sección Programas', key: 'home_programs_subtitle', label: 'Subtítulo', type: 'text', default: 'Oferta Programática' },
    { group: 'Sección Programas', key: 'home_programs_title', label: 'Título HTML', type: 'text', default: 'Elige tu camino hacia la <br /><span class="text-fsm-red">Excelencia</span>' },
    { group: 'Sección Certificaciones', key: 'home_cert_title', label: 'Título', type: 'text', default: 'RECONOCIMIENTO <br /> INSTITUCIONAL' },
    { group: 'Sección Certificaciones', key: 'home_cert_desc', label: 'Descripción', type: 'text', default: 'Operamos bajo la aprobación oficial de la Secretaría de Educación de Soacha y contamos con certificaciones internacionales que avalan nuestros procesos pedagógicos.' },
    { group: 'Valores (¿Por Qué Elegirnos?)', key: 'home_why_subtitle', label: 'Subtítulo', type: 'text', default: 'Nuestra Identidad' },
    { group: 'Valores (¿Por Qué Elegirnos?)', key: 'home_why_title', label: 'Título', type: 'text', default: 'VALORES QUE <br /><span class="text-fsm-red">TRANSFORMAN</span>' },
    { group: 'Valores (¿Por Qué Elegirnos?)', key: 'home_why_quote', label: 'Cita Principal', type: 'text', default: '"Formamos con vocación y excelencia técnica, integrando principios éticos y humanistas en cada paso de nuestro proceso educativo."' },
    { group: 'Testimonios', key: 'home_test_subtitle', label: 'Subtítulo', type: 'text', default: 'Testimonios' },
    { group: 'Testimonios', key: 'home_test_title', label: 'Título Principal', type: 'text', default: 'VOCES DE NUESTROS EGRESADOS' }
  ],
  "Institución": {
    "Acerca de la FSM": [
      { group: 'Encabezado', key: 'inst_about_title', label: 'Título', type: 'text', default: 'Acerca de FSM' },
      { group: 'Encabezado', key: 'inst_about_desc', label: 'Descripción', type: 'text', default: 'Nuestra historia y compromiso.' }
    ],
    "¿Por Qué Nosotros?": [
      { group: 'Propuesta de Valor', key: 'inst_why_title', label: 'Título', type: 'text', default: 'Por qué elegirnos' }
    ],
    "Normatividad": [
      { group: 'Documentos', key: 'inst_norm_title', label: 'Título Principal', type: 'text', default: 'Marco Legal' }
    ],
    "Directorio": [
      { group: 'Contacto', key: 'inst_dir_title', label: 'Título', type: 'text', default: 'Directorio Institucional' }
    ]
  },
  "Oferta Académica": [
    { group: 'Programas', key: 'academic_title', label: 'Título Principal', type: 'text', default: 'Nuestros Programas' }
  ],
  "Comunidad Digital": [
    { group: 'Redes', key: 'comunidad_title', label: 'Título Principal', type: 'text', default: 'Conéctate con Nosotros' }
  ]
};

export default function GlobalCMSForm({ initialContent }: GlobalCMSFormProps) {
  const [contentMap, setContentMap] = useState<Record<string, string>>(initialContent);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});

  // Navigation State
  const [activeCategory, setActiveCategory] = useState<string>("Inicio");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  // Determinar si la categoría actual tiene submenús (es un objeto y no un array)
  const isSubmenu = !Array.isArray(cmsStructure[activeCategory]);
  
  // Obtener los campos a renderizar
  let activeFields = [];
  if (isSubmenu) {
    // Si tiene submenú, pero no hay subcategoría seleccionada, seleccionamos la primera por defecto
    const subkeys = Object.keys(cmsStructure[activeCategory]);
    const currentSub = activeSubcategory && subkeys.includes(activeSubcategory) ? activeSubcategory : subkeys[0];
    activeFields = cmsStructure[activeCategory][currentSub];
  } else {
    activeFields = cmsStructure[activeCategory];
  }

  // Agrupar los campos activos por 'group'
  const groupedFields = activeFields.reduce((acc: any, field: any) => {
    if (!acc[field.group]) acc[field.group] = [];
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, any>);

  const handleUpdate = async (key: string, newValue: string, type: string) => {
    setLoadingMap(prev => ({ ...prev, [key]: true }));
    setSuccessMap(prev => ({ ...prev, [key]: false }));
    
    const res = await updateContent(key, newValue, '/', type);
    
    if (res?.success) {
      setContentMap(prev => ({ ...prev, [key]: newValue }));
      setSuccessMap(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setSuccessMap(prev => ({ ...prev, [key]: false })), 3000);
    } else {
      alert("Error al actualizar");
    }
    
    setLoadingMap(prev => ({ ...prev, [key]: false }));
  };

  const handleImageUpload = async (key: string, file: File) => {
    setLoadingMap(prev => ({ ...prev, [key]: true }));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
             await handleUpdate(key, compressedBase64, 'image');
          } else {
             alert('Error interno en el navegador. Intenta con otro.');
             setLoadingMap(prev => ({ ...prev, [key]: false }));
          }
        };
      };
      reader.onerror = () => {
         alert('No se pudo leer la imagen.');
         setLoadingMap(prev => ({ ...prev, [key]: false }));
      };
    } catch (e: any) {
      alert("Error fatal al procesar la imagen: " + e.message);
      setLoadingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Selector de Páginas / Menú de Navegación del CMS */}
      <div className="bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 mb-12">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 border-r border-gray-100 pr-6">
             <div className="w-12 h-12 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue">
               <FolderTree size={24} />
             </div>
             <div>
               <p className="text-[10px] font-black tracking-widest text-gray-700 uppercase">Sección Activa</p>
               <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">Gestor Global</h2>
             </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Main Category Selector */}
            <div className="relative">
              <label className="text-xs font-bold text-gray-900 mb-2 block uppercase tracking-widest">Página Principal</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-fsm-red cursor-pointer uppercase"
                  value={activeCategory}
                  onChange={(e) => {
                    setActiveCategory(e.target.value);
                    setActiveSubcategory(null); // Reset subcategory on main category change
                  }}
                >
                  {Object.keys(cmsStructure).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Subcategory Selector (Only visible if the category is a submenu) */}
            {isSubmenu && (
              <div className="relative">
                <label className="text-xs font-bold text-gray-900 mb-2 block uppercase tracking-widest">Sub-Sección</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-fsm-red cursor-pointer uppercase"
                    value={activeSubcategory || Object.keys(cmsStructure[activeCategory])[0]}
                    onChange={(e) => setActiveSubcategory(e.target.value)}
                  >
                    {Object.keys(cmsStructure[activeCategory]).map(subcat => (
                      <option key={subcat} value={subcat}>{subcat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none" size={16} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Renderizado de Campos */}
      <div className="space-y-12">
        {Object.entries(groupedFields).map(([groupName, fields]) => (
          <div key={groupName} className="bg-white p-8 rounded-[2rem] shadow-premium border border-gray-100">
            <h3 className="text-2xl font-black text-fsm-blue mb-6 pb-4 border-b border-gray-100">
              Sección: <span className="text-fsm-red">{groupName}</span>
            </h3>
            
            <div className="space-y-6">
              {(fields as any[]).map(field => {
                const currentValue = contentMap[field.key] ?? field.default;
                
                return (
                  <div key={field.key} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-colors">
                    
                    {/* Left Column: Label and Key */}
                    <div className="md:col-span-3 flex flex-col justify-start">
                      <div className="flex items-center gap-2 mb-1">
                        {field.type === 'image' ? <ImageIcon size={16} className="text-fsm-red" /> : <FileText size={16} className="text-fsm-blue" />}
                        <span className="font-bold text-gray-700 text-sm">{field.key}</span>
                      </div>
                      <span className="text-xs text-gray-700 uppercase tracking-widest">{field.type}</span>
                      <span className="text-[10px] font-bold text-fsm-blue mt-2 block">{field.label}</span>
                    </div>

                    {/* Middle Column: Input Area */}
                    <div className="md:col-span-7">
                      {field.type === 'text' ? (
                        <textarea 
                          defaultValue={currentValue}
                          className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-fsm-red outline-none min-h-[100px] text-sm text-gray-700 font-medium font-mono"
                          onBlur={(e) => {
                            if(e.target.value !== currentValue) {
                               handleUpdate(field.key, e.target.value, 'text');
                            }
                          }}
                        />
                      ) : (
                        <div className="flex flex-col gap-4">
                          {currentValue && (
                            <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-200 shadow-inner">
                               <Image src={currentValue} alt={field.key} fill className="object-cover" />
                            </div>
                          )}
                          <label className="cursor-pointer bg-fsm-blue text-white px-4 py-3 rounded-xl text-xs font-bold text-center hover:bg-fsm-red transition-all shadow-md inline-block w-full">
                             Cambiar Imagen
                             <input 
                               type="file" 
                               accept="image/*"
                               className="hidden" 
                               onChange={(e) => {
                                 if(e.target.files && e.target.files[0]) {
                                   handleImageUpload(field.key, e.target.files[0]);
                                 }
                               }}
                             />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Status */}
                    <div className="md:col-span-2 flex items-center justify-end h-full min-h-[40px]">
                       {loadingMap[field.key] && (
                         <span className="flex items-center gap-2 text-sm font-bold text-fsm-blue animate-pulse">
                           <Loader2 size={16} className="animate-spin" /> Guardando...
                         </span>
                       )}
                       {successMap[field.key] && (
                         <div className="flex flex-col items-center justify-center gap-1">
                           <CheckCircle size={24} className="text-green-500" />
                           <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Guardado</span>
                         </div>
                       )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
