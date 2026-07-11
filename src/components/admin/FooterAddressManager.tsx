"use client";

import React, { useState } from "react";
import { updateFooterAddress, addFooterAddress, deleteFooterAddress } from "@/app/actions";
import { Plus, Trash2, Save, MapPin, Loader2, CheckCircle } from "lucide-react";

interface FooterAddress {
  id: string;
  name: string;
  address: string;
  order_index: number;
}

interface FooterAddressManagerProps {
  initialItems: FooterAddress[];
}

export default function FooterAddressManager({ initialItems }: FooterAddressManagerProps) {
  const [items, setItems] = useState<FooterAddress[]>(initialItems);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", address: "", order_index: 0 });

  const handleUpdate = async (id: string, field: keyof FooterAddress, value: any) => {
    const updated = items.map((t) => (t.id === id ? { ...t, [field]: value } : t));
    setItems(updated);
  };

  const saveUpdate = async (id: string) => {
    const item = items.find((t) => t.id === id);
    if (!item) return;

    setLoading((prev) => ({ ...prev, [id]: true }));
    const res = await updateFooterAddress(id, item.name, item.address, item.order_index);

    if (res.success) {
      setSuccess((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => setSuccess((prev) => ({ ...prev, [id]: false })), 3000);
    } else {
      alert("Error al guardar");
    }
    setLoading((prev) => ({ ...prev, [id]: false }));
  };

  const handleAdd = async () => {
    if (!newItem.name || !newItem.address) {
      alert("Nombre de la sede y Dirección son obligatorios");
      return;
    }

    setIsAdding(true);
    const res = await addFooterAddress(newItem.name, newItem.address, newItem.order_index);
    if (res.success && res.item) {
      const addedItem: FooterAddress = {
        id: res.item.id.toString(),
        name: res.item.name,
        address: res.item.address,
        order_index: res.item.order_index
      };
      setItems((prev) => [...prev, addedItem].sort((a, b) => a.order_index - b.order_index));
      setNewItem({ name: "", address: "", order_index: 0 });
      setIsAdding(false);
    } else {
      alert("Error al añadir");
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta sede/dirección?")) return;

    const res = await deleteFooterAddress(id);
    if (res.success) {
      setItems((prev) => prev.filter((t) => t.id !== id));
    } else {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">Direcciones del Footer</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Administra las sedes y direcciones que se muestran en el pie de página
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-fsm-red text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 font-black text-xs tracking-widest uppercase"
        >
          {isAdding ? "Cancelar" : <><Plus size={18} /> Nueva Dirección</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[2rem] shadow-premium border-2 border-fsm-red/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <h3 className="text-fsm-red font-black uppercase text-sm mb-6 flex items-center gap-2">
            <Plus size={16} /> Agregar Nueva Dirección
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Sede (Ej: Sede Académica)</label>
              <input
                type="text"
                placeholder="Nombre de la sede"
                className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Dirección (Ej: calle 19 # 7A-29)</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Dirección física"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                  value={newItem.address}
                  onChange={(e) => setNewItem({ ...newItem, address: e.target.value })}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Sede</label>
                    <input
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-fsm-blue focus:ring-2 focus:ring-fsm-blue outline-none"
                      value={t.name}
                      onChange={(e) => handleUpdate(t.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Dirección</label>
                    <input
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-gray-500 focus:ring-2 focus:ring-fsm-blue outline-none"
                      value={t.address}
                      onChange={(e) => handleUpdate(t.id, "address", e.target.value)}
                    />
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
