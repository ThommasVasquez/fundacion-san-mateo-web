"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Calendar, Tag, Link as LinkIcon, Newspaper } from "lucide-react";
import { addNewsEvent, updateNewsEvent, deleteNewsEvent } from "@/app/actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface NewsEvent {
  id: string;
  title: string;
  description: string;
  image_url: string;
  date_text: string;
  category: string;
  link: string;
}

interface NewsManagerProps {
  news: NewsEvent[];
}

const NewsManager = ({ news: initialNews }: NewsManagerProps) => {
  const [news, setNews] = useState<NewsEvent[]>(initialNews);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NewsEvent>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEdit = (item: NewsEvent) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm.title) {
      toast.error("El título es obligatorio");
      return;
    }

    setIsLoading(true);
    try {
      if (isAdding) {
        const res = await addNewsEvent(editForm as any);
        if (res.success) {
          toast.success("Noticia agregada correctamente");
          router.refresh();
          // Update local state or just let refresh handle it
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(res.error || "Error al agregar noticia");
        }
      } else if (editingId) {
        const res = await updateNewsEvent(editingId, editForm as any);
        if (res.success) {
          toast.success("Noticia actualizada correctamente");
          router.refresh();
          setEditingId(null);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(res.error || "Error al actualizar noticia");
        }
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta noticia?")) return;

    setIsLoading(true);
    try {
      const res = await deleteNewsEvent(id);
      if (res.success) {
        toast.success("Noticia eliminada");
        router.refresh();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(res.error || "Error al eliminar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-fsm-blue flex items-center gap-2">
            <Newspaper className="text-fsm-red" />
            GESTIÓN DE NOTICIAS Y EVENTOS
          </h3>
          <p className="text-sm text-gray-500 font-medium">Administra el magazine institucional</p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditForm({
                title: "",
                description: "",
                image_url: "/img/news/news6.jpg",
                date_text: "",
                category: "Institucional",
                link: ""
              });
            }}
            className="flex items-center gap-2 bg-fsm-blue text-white px-6 py-3 rounded-2xl font-black text-xs tracking-widest hover:bg-fsm-red transition-all shadow-lg"
          >
            <Plus size={18} /> AGREGAR NOTICIA
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-fsm-blue/10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Título de la Noticia</label>
              <div className="relative">
                <Edit2 className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <input
                  type="text"
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                  placeholder="Ej: Gran Jornada de Salud"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Categoría</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <input
                  type="text"
                  value={editForm.category || ""}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                  placeholder="Ej: Institucional, Admisiones..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Fecha Visible</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <input
                  type="text"
                  value={editForm.date_text || ""}
                  onChange={(e) => setEditForm({ ...editForm, date_text: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                  placeholder="Ej: Septiembre 2024"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Imagen URL</label>
              <div className="relative">
                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <input
                  type="text"
                  value={editForm.image_url || ""}
                  onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                  placeholder="/img/news/noticia.jpg"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Link "Explorar noticia" (Facebook/Instagram/Web)</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <input
                  type="text"
                  value={editForm.link || ""}
                  onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                  placeholder="https://facebook.com/..."
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Resumen / Descripción</label>
              <textarea
                value={editForm.description || ""}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm min-h-[120px]"
                placeholder="Breve descripción de la noticia..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs tracking-widest text-gray-500 hover:bg-gray-200 transition-all"
            >
              <X size={18} /> CANCELAR
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 bg-fsm-red text-white px-8 py-3 rounded-2xl font-black text-xs tracking-widest hover:bg-fsm-blue transition-all shadow-lg disabled:opacity-50"
            >
              {isLoading ? "GUARDANDO..." : <><Save size={18} /> GUARDAR NOTICIA</>}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="relative h-40 rounded-3xl overflow-hidden mb-6">
               <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
               <div className="absolute top-4 left-4 bg-fsm-red text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  {item.category}
               </div>
            </div>
            <h4 className="font-black text-fsm-blue mb-2 line-clamp-1">{item.title}</h4>
            <p className="text-xs text-gray-500 mb-6 font-bold flex items-center gap-2">
              <Calendar size={14} className="text-fsm-red" />
              {item.date_text}
            </p>
            <div className="flex justify-between items-center pt-4 border-t border-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-3 bg-fsm-blue/5 text-fsm-blue rounded-xl hover:bg-fsm-blue hover:text-white transition-all"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-3 bg-fsm-red/5 text-fsm-red rounded-xl hover:bg-fsm-red hover:text-white transition-all"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <a href={item.link} target="_blank" className="text-fsm-blue/30 hover:text-fsm-red transition-colors">
                <LinkIcon size={18} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsManager;
