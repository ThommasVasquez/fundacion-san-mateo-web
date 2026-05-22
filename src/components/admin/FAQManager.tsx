"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, Save, X, HelpCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// Server Actions Placeholder - We'll add these next
import { addFAQ, updateFAQ, deleteFAQ } from "@/app/actions";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order_index: number;
}

interface FAQManagerProps {
  faqs: FAQ[];
}

const FAQManager = ({ faqs: initialFaqs }: FAQManagerProps) => {
  const [faqs, setFaqs] = useState<FAQ[]>(initialFaqs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FAQ>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEdit = (item: FAQ) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm.question || !editForm.answer) {
      toast.error("La pregunta y la respuesta son obligatorias");
      return;
    }

    setIsLoading(true);
    try {
      if (isAdding) {
        const res = await addFAQ(editForm as any);
        if (res.success) {
          toast.success("Pregunta agregada correctamente");
          router.refresh();
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(res.error || "Error al agregar");
        }
      } else if (editingId) {
        const res = await updateFAQ(editingId, editForm as any);
        if (res.success) {
          toast.success("Pregunta actualizada correctamente");
          router.refresh();
          setEditingId(null);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(res.error || "Error al actualizar");
        }
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta pregunta frecuente?")) return;

    setIsLoading(true);
    try {
      const res = await deleteFAQ(id);
      if (res.success) {
        toast.success("Pregunta eliminada");
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
            <HelpCircle className="text-fsm-red" />
            GESTIÓN DE PREGUNTAS FRECUENTES (FAQ)
          </h3>
          <p className="text-sm text-gray-500 font-medium">Administra las dudas comunes de la comunidad estudiantil</p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditForm({
                question: "",
                answer: "",
                order_index: faqs.length
              });
            }}
            className="flex items-center gap-2 bg-fsm-blue text-white px-6 py-3 rounded-2xl font-black text-xs tracking-widest hover:bg-fsm-red transition-all shadow-lg"
          >
            <Plus size={18} /> AGREGAR PREGUNTA
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-fsm-blue/10 space-y-6 shadow-inner">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Pregunta</label>
              <input
                type="text"
                value={editForm.question || ""}
                onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
                placeholder="Ej: ¿Cuáles son los requisitos de matrícula?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Respuesta</label>
              <textarea
                value={editForm.answer || ""}
                onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm min-h-[150px]"
                placeholder="Escriba la respuesta detallada aquí..."
              />
            </div>

            <div className="space-y-2 max-w-[200px]">
              <label className="text-[10px] font-black text-fsm-blue tracking-widest uppercase ml-4">Orden de Visualización</label>
              <input
                type="number"
                value={editForm.order_index ?? 0}
                onChange={(e) => setEditForm({ ...editForm, order_index: parseInt(e.target.value) })}
                className="w-full px-6 py-3 rounded-2xl border border-gray-200 focus:border-fsm-blue outline-none font-bold text-sm"
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
              {isLoading ? "GUARDANDO..." : <><Save size={18} /> GUARDAR PREGUNTA</>}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {faqs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
            <HelpCircle className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay preguntas registradas</p>
          </div>
        ) : (
          faqs.sort((a,b) => a.order_index - b.order_index).map((item) => (
            <div key={item.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-fsm-blue/5 text-fsm-blue rounded-full flex items-center justify-center font-black text-xs">
                      {item.order_index}
                    </span>
                    <h4 className="text-lg font-black text-fsm-blue uppercase tracking-tight leading-snug">
                      {item.question}
                    </h4>
                  </div>
                  <p className="text-gray-600 font-medium leading-relaxed pl-11">
                    {item.answer}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-3 bg-fsm-blue/5 text-fsm-blue rounded-2xl hover:bg-fsm-blue hover:text-white transition-all"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-3 bg-fsm-red/5 text-fsm-red rounded-2xl hover:bg-fsm-red hover:text-white transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-fsm-blue/5 p-6 rounded-[2rem] border border-fsm-blue/10 flex items-start gap-4">
          <Info className="text-fsm-blue shrink-0 mt-1" size={20} />
          <div className="space-y-1">
              <h5 className="text-xs font-black text-fsm-blue uppercase tracking-widest">Consejo de Redacción</h5>
              <p className="text-[10px] text-gray-600 font-bold leading-relaxed">
                  Trate de ser conciso y directo en las respuestas. Una buena FAQ reduce significativamente las llamadas a secretaría y mejora la experiencia del estudiante.
              </p>
          </div>
      </div>
    </div>
  );
};

export default FAQManager;
