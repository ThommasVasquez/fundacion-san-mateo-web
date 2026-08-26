"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Calendar, Tag, Info, CalendarDays } from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/dateUtils";
import { addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/app/actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  type: string;
  button_text?: string;
  button_link?: string;
}

interface CalendarManagerProps {
  events: CalendarEvent[];
  blogPosts?: { id: string; title: string; slug: string }[];
}

const CalendarManager = ({ events: initialEvents, blogPosts = [] }: CalendarManagerProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CalendarEvent>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEdit = (item: CalendarEvent) => {
    setEditingId(item.id);
    // Format dates for input type="date"
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    };
    
    setEditForm({
        ...item,
        start_date: formatDate(item.start_date),
        end_date: formatDate(item.end_date)
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm.title || !editForm.start_date) {
      toast.error("El título y la fecha de inicio son obligatorios");
      return;
    }

    setIsLoading(true);
    try {
      if (isAdding) {
        const res = await addCalendarEvent(editForm as any);
        if (res.success) {
          toast.success("Evento agregado correctamente");
          router.refresh();
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(res.error || "Error al agregar evento");
        }
      } else if (editingId) {
        const res = await updateCalendarEvent(editingId, editForm as any);
        if (res.success) {
          toast.success("Evento actualizado correctamente");
          router.refresh();
          setEditingId(null);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(res.error || "Error al actualizar evento");
        }
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este evento del calendario?")) return;

    setIsLoading(true);
    try {
      const res = await deleteCalendarEvent(id);
      if (res.success) {
        toast.success("Evento eliminado");
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

  const eventTypes = [
    { value: "academic", label: "Académico (Clases/Semestres)", color: "bg-fsm-blue" },
    { value: "holiday", label: "Festivo / Vacaciones", color: "bg-fsm-red" },
    { value: "exam", label: "Exámenes / Evaluaciones", color: "bg-orange-500" },
    { value: "admission", label: "Admisiones / Matrículas", color: "bg-green-600" },
    { value: "event", label: "Evento Institucional", color: "bg-purple-600" }
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-fsm-blue flex items-center gap-2">
            <CalendarDays className="text-fsm-red" />
            GESTIÓN DE CALENDARIO ACADÉMICO
          </h3>
          <p className="text-sm text-gray-500 font-medium">Administra las fechas y eventos del cronograma escolar</p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditForm({
                title: "",
                description: "",
                start_date: new Date().toISOString().split('T')[0],
                end_date: "",
                type: "academic",
                button_text: "",
                button_link: ""
              });
            }}
            className="flex items-center gap-2 bg-fsm-blue text-white px-6 py-3 rounded-2xl font-black text-xs tracking-widest hover:bg-fsm-red transition-all shadow-lg"
          >
            <Plus size={18} /> AGREGAR EVENTO
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-fsm-blue/10 space-y-6 shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Título del Evento</label>
              <div className="relative">
                <Edit2 className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <input
                  type="text"
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                  placeholder="Ej: Inicio de Semestre 2024-II"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Tipo de Evento</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <select
                  value={editForm.type || "academic"}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm appearance-none"
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Fecha de Inicio</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <input
                  type="date"
                  value={editForm.start_date || ""}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Fecha de Finalización (Opcional)</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <input
                  type="date"
                  value={editForm.end_date || ""}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Descripción / Detalles</label>
              <textarea
                value={editForm.description || ""}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm min-h-[100px]"
                placeholder="Detalles adicionales sobre el evento..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Texto del Botón (Opcional)</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                <input
                  type="text"
                  value={editForm.button_text || ""}
                  onChange={(e) => setEditForm({ ...editForm, button_text: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                  placeholder="Ej: Inscribirse ahora"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Enlace del Botón (Opcional)</label>
              <div className="flex flex-col gap-4">
                <div className="relative">
                    <Info className="absolute left-4 top-1/2 -translate-y-1/2 text-fsm-blue/30" size={18} />
                    <input
                    type="text"
                    value={editForm.button_link || ""}
                    onChange={(e) => setEditForm({ ...editForm, button_link: e.target.value })}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                    placeholder="Escriba URL o seleccione una noticia abajo..."
                    />
                </div>
                
                {blogPosts.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-4">Vincular a una noticia reciente:</label>
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    setEditForm({ ...editForm, button_link: `/blog/${e.target.value}`, button_text: "Leer Noticia" });
                                }
                            }}
                            className="w-full px-6 py-3 rounded-xl border border-dashed border-gray-300 bg-white outline-none font-bold text-[10px] text-fsm-blue"
                        >
                            <option value="">-- Seleccionar Noticia --</option>
                            {blogPosts.map(post => (
                                <option key={post.id} value={post.slug}>{post.title}</option>
                            ))}
                        </select>
                    </div>
                )}
              </div>
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
              {isLoading ? "GUARDANDO..." : <><Save size={18} /> GUARDAR EVENTO</>}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[10px] font-black text-fsm-blue uppercase tracking-widest">Estado</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-fsm-blue uppercase tracking-widest">Evento</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-fsm-blue uppercase tracking-widest">Fecha</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-fsm-blue uppercase tracking-widest">Tipo</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-fsm-blue uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {events.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                        No hay eventos registrados en el calendario
                    </td>
                </tr>
            ) : (
                events.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-black text-fsm-blue text-sm uppercase tracking-tight">{item.title}</span>
                        {item.description && <span className="text-[10px] text-gray-500 font-medium line-clamp-1">{item.description}</span>}
                    </div>
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                        <Calendar size={14} className="text-fsm-red" />
                        {formatDateDDMMYYYY(item.start_date)}
                        {item.end_date && (
                            <>
                                <span className="text-gray-300">→</span>
                                {formatDateDDMMYYYY(item.end_date)}
                            </>
                        )}
                    </div>
                    </td>
                    <td className="px-6 py-4">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest text-white ${eventTypes.find(t => t.value === item.type)?.color || 'bg-gray-400'}`}>
                        {eventTypes.find(t => t.value === item.type)?.label.split(' (')[0] || item.type}
                    </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button
                        onClick={() => handleEdit(item)}
                        className="p-2 bg-fsm-blue/5 text-fsm-blue rounded-xl hover:bg-fsm-blue hover:text-white transition-all"
                        title="Editar"
                        >
                        <Edit2 size={14} />
                        </button>
                        <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-fsm-red/5 text-fsm-red rounded-xl hover:bg-fsm-red hover:text-white transition-all"
                        title="Eliminar"
                        >
                        <Trash2 size={14} />
                        </button>
                    </div>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-fsm-blue/5 p-6 rounded-[2rem] border border-fsm-blue/10 flex items-start gap-4">
          <Info className="text-fsm-blue shrink-0 mt-1" size={20} />
          <div className="space-y-1">
              <h5 className="text-xs font-black text-fsm-blue uppercase tracking-widest">Sincronización Automática</h5>
              <p className="text-[10px] text-gray-600 font-bold leading-relaxed">
                  Los cambios realizados aquí se reflejarán instantáneamente en la página de Calendario Académico. 
                  Asegúrese de verificar las fechas antes de guardar para mantener la precisión del cronograma escolar.
              </p>
          </div>
      </div>
    </div>
  );
};

export default CalendarManager;
