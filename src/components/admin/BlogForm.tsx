'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { upsertBlogPost } from '@/app/actions';
import { Save, ArrowLeft, Image as ImageIcon, Layout, Type, FileText } from 'lucide-react';
import Link from 'next/link';

interface BlogFormProps {
  initialData?: {
    id?: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    author: string;
    image_base64: string | null;
    published: boolean;
  };
  isNew?: boolean;
}

export default function BlogForm({ initialData, isNew = false }: BlogFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    author: initialData?.author || 'Fundación San Mateo',
    image_base64: initialData?.image_base64 || '',
    published: initialData?.published ?? true,
  });

  const [previewMode, setPreviewMode] = useState(false);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .normalize('NFD') // Normalize to separate accents from chars
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'title' && isNew) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value)
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
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
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setFormData(prev => ({ ...prev, image_base64: compressed }));
        }
      };
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // We pass the formData to server action
    const res = await upsertBlogPost({
      ...formData,
      id: formData.id || undefined
    });

    if (res.success) {
      router.push('/admin/blog');
      router.refresh();
    } else {
      alert("Error: " + res.error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between sticky top-24 z-20 bg-gray-50/80 backdrop-blur-md py-4 rounded-2xl">
        <Link href="/admin/blog" className="flex items-center gap-2 text-gray-500 hover:text-fsm-blue font-bold transition-all">
          <ArrowLeft size={18} />
          VOLVER AL LISTADO
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-fsm-blue text-white px-8 py-3 rounded-2xl font-black text-xs tracking-[0.2em] shadow-xl shadow-fsm-blue/20 hover:bg-fsm-red transition-all disabled:opacity-50"
        >
          <Save size={18} />
          {loading ? 'GUARDANDO...' : 'GUARDAR ARTÍCULO'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-gray-100 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-fsm-blue tracking-widest uppercase mb-3 flex items-center gap-2">
                <Type size={14} className="text-fsm-red" />
                Título del Artículo
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full text-2xl font-black text-fsm-blue p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-fsm-red/20 transition-all outline-none"
                placeholder="Escribe un título impactante..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-fsm-blue tracking-widest uppercase mb-3 flex items-center gap-2">
                <FileText size={14} className="text-fsm-red" />
                Resumen / Extracto
              </label>
              <textarea
                required
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                className="w-full text-sm font-medium text-gray-500 p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-fsm-red outline-none min-h-[100px] resize-none"
                placeholder="Un breve resumen que invite a leer..."
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
               <div className="flex items-center justify-between mb-4">
                  <label className="block text-[10px] font-black text-fsm-blue tracking-widest uppercase flex items-center gap-2">
                    <Layout size={14} className="text-fsm-red" />
                    Contenido {previewMode ? '(Vista Previa)' : ''}
                  </label>
                  <button 
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-[10px] font-black px-3 py-1 rounded-lg bg-fsm-blue/5 text-fsm-blue hover:bg-fsm-blue/10"
                  >
                    {previewMode ? 'EDITAR' : 'PREVISUALIZAR'}
                  </button>
               </div>
               
               {previewMode ? (
                 <div className="prose prose-slate max-w-none bg-gray-50 p-6 rounded-2xl min-h-[400px]">
                    <div dangerouslySetInnerHTML={{ __html: formData.content.replace(/\n/g, '<br />') }} />
                 </div>
               ) : (
                 <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full font-mono text-sm p-6 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-fsm-red outline-none min-h-[400px]"
                  placeholder="Escribe el cuerpo del artículo. Puedes usar HTML básico si lo deseas..."
                />
               )}
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-fsm-blue tracking-widest uppercase mb-4">Imagen de Portada</label>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 group cursor-pointer hover:border-fsm-red/50 transition-all">
                {formData.image_base64 ? (
                  <img src={formData.image_base64} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                    <ImageIcon size={48} strokeWidth={1} />
                    <span className="text-[10px] font-black mt-2">SELECCIONAR IMAGEN</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-[9px] text-gray-400 mt-2 text-center">Recomendado: 1200x800px. Se optimizará automáticamente.</p>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <label className="block text-[10px] font-black text-fsm-blue tracking-widest uppercase mb-3">Slug (URL amigable)</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                className="w-full text-xs font-mono p-3 rounded-xl bg-gray-50 border-none focus:ring-1 focus:ring-fsm-red outline-none"
              />
            </div>

            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <div>
                <label className="block text-[10px] font-black text-fsm-blue tracking-widest uppercase">Estado</label>
                <p className="text-[10px] text-gray-400">¿Visible en la web?</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.published} 
                  onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fsm-red"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
