"use client";

import React, { useState } from "react";
import { updateFooterCertification, addFooterCertification, deleteFooterCertification } from "@/app/actions";
import { Plus, Trash2, Save, Image as ImageIcon, Loader2, CheckCircle, ArrowUp, ArrowDown } from "lucide-react";
import { compressImageToBase64 } from "@/lib/imageUpload";
import toast from "react-hot-toast";

interface FooterCertification {
  id: string;
  name: string;
  image_url: string;
  order_index: number;
}

interface FooterCertificationsManagerProps {
  initialItems: FooterCertification[];
}

export default function FooterCertificationsManager({ initialItems }: FooterCertificationsManagerProps) {
  const [items, setItems] = useState<FooterCertification[]>(initialItems);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", image_url: "", order_index: 0 });

  const handleUpdate = async (id: string, field: keyof FooterCertification, value: any) => {
    const updated = items.map((t) => (t.id === id ? { ...t, [field]: value } : t));
    setItems(updated);
  };

  const saveUpdate = async (id: string) => {
    const item = items.find((t) => t.id === id);
    if (!item) return;

    setLoading((prev) => ({ ...prev, [id]: true }));
    const res = await updateFooterCertification(id, item.name, item.image_url, item.order_index);

    if (res.success) {
      setSuccess((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => setSuccess((prev) => ({ ...prev, [id]: false })), 3000);
      toast.success("Certificación guardada");
    } else {
      toast.error(res.error || "Error al guardar");
    }
    setLoading((prev) => ({ ...prev, [id]: false }));
  };

  const handleAdd = async () => {
    if (!newItem.name || !newItem.image_url) {
      toast.error("El nombre y la imagen de la certificación son obligatorios");
      return;
    }

    setIsAdding(true);
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 0;
    const res = await addFooterCertification(newItem.name, newItem.image_url, nextOrder);
    
    if (res.success && res.item) {
      const addedItem: FooterCertification = {
        id: res.item.id.toString(),
        name: res.item.name,
        image_url: res.item.image_url,
        order_index: res.item.order_index
      };
      setItems((prev) => [...prev, addedItem].sort((a, b) => a.order_index - b.order_index));
      setNewItem({ name: "", image_url: "", order_index: 0 });
      setIsAdding(false);
      toast.success("Certificación agregada");
    } else {
      toast.error(res.error || "Error al añadir");
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta certificación?")) return;

    const res = await deleteFooterCertification(id);
    if (res.success) {
      setItems((prev) => prev.filter((t) => t.id !== id));
      toast.success("Certificación eliminada");
    } else {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">Gestor de Certificaciones</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Agrega, edita o elimina los logotipos de certificación expuestos en el footer
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-fsm-red text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 font-black text-xs tracking-widest uppercase"
        >
          {isAdding ? "Cancelar" : <><Plus size={18} /> Nueva Certificación</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[2rem] shadow-premium border-2 border-fsm-red/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <h3 className="text-fsm-red font-black uppercase text-sm mb-6 flex items-center gap-2">
            <Plus size={16} /> Crear Nueva Certificación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Nombre (Ej: ISO 9001)</label>
              <input
                type="text"
                placeholder="Nombre o norma de la certificación"
                className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Logotipo / Imagen</label>
              <div className="relative h-14 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-center overflow-hidden hover:border-fsm-red transition-all cursor-pointer group">
                {newItem.image_url ? (
                  <img src={newItem.image_url} alt="Preview" className="w-full h-full object-cover" />
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
                        setNewItem({ ...newItem, image_url: base64 });
                      } catch (err) {
                        toast.error("Error al procesar la imagen");
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-fsm-blue text-white py-4 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-fsm-red transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            Guardar y Publicar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {items.map((t) => (
          <div
            key={t.id}
            className="bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-blue/20 transition-all group"
          >
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Nombre / Leyenda</label>
                    <input
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-fsm-blue focus:ring-2 focus:ring-fsm-blue outline-none"
                      value={t.name}
                      onChange={(e) => handleUpdate(t.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Imagen de Certificación</label>
                    <div className="relative h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden hover:border-fsm-blue transition-all cursor-pointer group">
                      {t.image_url ? (
                        <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-gray-400 group-hover:text-fsm-blue flex items-center gap-2">
                          <ImageIcon size={14} /> Reemplazar
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
                              handleUpdate(t.id, "image_url", base64);
                            } catch (err) {
                              toast.error("Error al procesar la imagen");
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex md:flex-col gap-2 justify-center items-center px-4 border-l border-gray-50">
                <button
                  onClick={() => saveUpdate(t.id)}
                  className="p-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                >
                  {loading[t.id] ? (
                    <Loader2 className="animate-spin" />
                  ) : success[t.id] ? (
                    <CheckCircle />
                  ) : (
                    <Save />
                  )}
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
