"use client";

import React, { useState } from 'react';
import { addNormativityDocument, updateNormativityDocument, deleteNormativityDocument } from '@/app/actions';
import { Plus, Trash2, Save, FileText, Upload, Link2, Loader2, CheckCircle, AlertCircle, FileCheck, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface NormativityDoc {
  id: string;
  title: string;
  category_key: string;
  file_name?: string;
  external_link?: string;
  order_index?: number;
  file_base64?: string;
}

interface NormativityManagerProps {
  initialDocs: NormativityDoc[];
  initialCategoriesJson: string;
}

interface CategoryItem {
  key: string;
  label: string;
  icon: string;
}

export default function NormativityManager({ initialDocs, initialCategoriesJson }: NormativityManagerProps) {
  const [docs, setDocs] = useState<NormativityDoc[]>(initialDocs);
  
  // Parse categories from JSON or fall back to defaults
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      if (initialCategoriesJson) {
        const parsed = JSON.parse(initialCategoriesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: any) => ({
            key: c.key,
            label: c.label,
            icon: c.icon || 'file'
          }));
        }
      }
    } catch (e) {
      console.error("Error parsing initial categories json", e);
    }
    return [
      { key: 'norm_cat1', label: 'Aprobación oficial Soacha', icon: 'file' },
      { key: 'norm_cat2', label: 'Programa Enfermería', icon: 'shield' },
      { key: 'norm_cat3', label: 'Programa Primera Infancia', icon: 'scale' },
      { key: 'norm_cat4', label: 'Documentos Institucionales', icon: 'gavel' },
      { key: 'norm_cat5', label: 'Programa Servicios Farmacéuticos', icon: 'signature' },
      { key: 'norm_cat6', label: 'Programa Asistencia Administrativa', icon: 'book' },
    ];
  });

  const [activeTab, setActiveTab] = useState<string>(() => categories[0]?.key || 'norm_cat1');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);

  const saveCategoriesToDb = async (updatedCategories: CategoryItem[]) => {
    try {
      const { updateContent } = await import('@/app/actions');
      const res = await updateContent('normativity_categories', JSON.stringify(updatedCategories), '/institucion/normatividad');
      if (res.error) {
        toast.error(res.error);
      }
    } catch (e) {
      console.error("Error saving categories:", e);
      toast.error("Error al guardar secciones en la base de datos");
    }
  };
  
  const [newDoc, setNewDoc] = useState<{
    title: string;
    type: 'upload' | 'link';
    file_name: string;
    file_base64: string;
    external_link: string;
  }>({
    title: '',
    type: 'upload',
    file_name: '',
    file_base64: '',
    external_link: ''
  });

  const currentDocs = docs
    .filter(d => d.category_key === activeTab)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const handleUpdateLocal = (id: string, field: keyof NormativityDoc, value: any) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo supera el límite de 5MB permitido.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (docId) {
        // Edit existing document locally
        handleUpdateLocal(docId, 'file_base64', base64);
        handleUpdateLocal(docId, 'file_name', file.name);
        handleUpdateLocal(docId, 'external_link', ''); // clear link when uploading file
      } else {
        // Add new document form
        setNewDoc(prev => ({
          ...prev,
          file_name: file.name,
          file_base64: base64,
          external_link: ''
        }));
      }
      toast.success(`Archivo "${file.name}" cargado localmente`);
    };
    reader.onerror = () => {
      toast.error("Error al leer el archivo PDF");
    };
  };

  const saveUpdate = async (id: string) => {
    const doc = docs.find(d => d.id === id);
    if (!doc) return;

    if (!doc.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    setLoading(prev => ({ ...prev, [id]: true }));
    
    // We send payload
    const payload: any = {
      title: doc.title,
      category_key: doc.category_key,
      order_index: doc.order_index || 0
    };

    if (doc.file_base64) {
      payload.file_base64 = doc.file_base64;
      payload.file_name = doc.file_name;
      payload.external_link = null;
    } else {
      payload.external_link = doc.external_link || null;
      if (payload.external_link) {
        payload.file_name = null;
        payload.file_base64 = null;
      } else {
        payload.file_name = doc.file_name || null;
      }
    }

    const res = await updateNormativityDocument(id, payload);
    if (res.success) {
      setSuccess(prev => ({ ...prev, [id]: true }));
      // Clear local base64 to save memory
      handleUpdateLocal(id, 'file_base64', undefined);
      setTimeout(() => setSuccess(prev => ({ ...prev, [id]: false })), 3000);
      toast.success("Documento actualizado con éxito");
    } else {
      toast.error(res.error || "Error al actualizar");
    }
    setLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleAdd = async () => {
    if (!newDoc.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    if (newDoc.type === 'upload' && !newDoc.file_base64) {
      toast.error("Debes seleccionar un archivo PDF");
      return;
    }

    if (newDoc.type === 'link' && !newDoc.external_link.trim()) {
      toast.error("Debes ingresar un enlace URL");
      return;
    }

    setLoading(prev => ({ ...prev, 'adding': true }));

    const payload = {
      title: newDoc.title,
      category_key: activeTab,
      file_name: newDoc.type === 'upload' ? newDoc.file_name : undefined,
      file_base64: newDoc.type === 'upload' ? newDoc.file_base64 : undefined,
      external_link: newDoc.type === 'link' ? newDoc.external_link : undefined
    };

    const res = await addNormativityDocument(payload);
    if (res.success) {
      toast.success("Documento agregado con éxito");
      window.location.reload();
    } else {
      toast.error(res.error || "Error al agregar");
      setLoading(prev => ({ ...prev, 'adding': false }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro que desea eliminar este documento?")) return;

    setLoading(prev => ({ ...prev, [id]: true }));
    const res = await deleteNormativityDocument(id);
    if (res.success) {
      toast.success("Documento eliminado");
      setDocs(prev => prev.filter(d => d.id !== id));
    } else {
      toast.error(res.error || "Error al eliminar");
    }
    setLoading(prev => ({ ...prev, [id]: false }));
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentDocs.length) return;

    const list = [...currentDocs];
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    // Update locally
    const updatedDocs = docs.map(d => {
      const matchIndex = list.findIndex(item => item.id === d.id);
      if (matchIndex !== -1) {
        return { ...d, order_index: matchIndex };
      }
      return d;
    });

    setDocs(updatedDocs);

    // Save order changes to DB
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      await updateNormativityDocument(item.id, {
        title: item.title,
        category_key: item.category_key,
        order_index: i,
        external_link: item.external_link,
        file_name: item.file_name
      });
    }
    toast.success("Orden de documentos actualizado");
  };

  return (
    <div className="space-y-8">
      {/* Category Tabs Selector */}
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-[2rem] border border-gray-100">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              setActiveTab(cat.key);
              setIsAdding(false);
            }}
            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === cat.key
                ? 'bg-fsm-blue text-white shadow-lg'
                : 'text-gray-500 hover:text-fsm-red hover:bg-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
        
        <button
          onClick={() => {
            setActiveTab('manage_categories');
            setIsAdding(false);
          }}
          className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 border border-dashed border-fsm-red/40 ${
            activeTab === 'manage_categories'
              ? 'bg-fsm-red text-white shadow-lg'
              : 'text-fsm-red hover:bg-fsm-red/5'
          }`}
        >
          ⚙️ Administrar Secciones
        </button>
      </div>

      {activeTab === 'manage_categories' ? (
        /* Categories Management View */
        <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-gray-100 space-y-8">
          <div className="flex justify-between items-center border-b border-gray-100 pb-6">
            <div>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">Administrar Secciones</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                Cree, edite, ordene o elimine las categorías de la normatividad
              </p>
            </div>
            <button
              onClick={() => {
                const newKey = `norm_cat_${Date.now()}`;
                const list = [...categories, { key: newKey, label: 'Nueva Sección', icon: 'file' }];
                setCategories(list);
                saveCategoriesToDb(list);
                toast.success("Nueva sección agregada");
              }}
              className="bg-fsm-red text-white px-5 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 font-black text-[10px] tracking-widest uppercase"
            >
              <Plus size={14} /> Nueva Sección
            </button>
          </div>

          <div className="space-y-4">
            {categories.map((cat, idx) => (
              <div key={cat.key} className="flex flex-col md:flex-row items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-150">
                {/* Order indicators */}
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (idx === 0) return;
                      const list = [...categories];
                      const temp = list[idx];
                      list[idx] = list[idx-1];
                      list[idx-1] = temp;
                      setCategories(list);
                      saveCategoriesToDb(list);
                    }}
                    disabled={idx === 0}
                    className="p-2 bg-white rounded-lg border border-gray-100 text-gray-400 hover:text-fsm-blue disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (idx === categories.length - 1) return;
                      const list = [...categories];
                      const temp = list[idx];
                      list[idx] = list[idx+1];
                      list[idx+1] = temp;
                      setCategories(list);
                      saveCategoriesToDb(list);
                    }}
                    disabled={idx === categories.length - 1}
                    className="p-2 bg-white rounded-lg border border-gray-100 text-gray-400 hover:text-fsm-blue disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                {/* Label Input */}
                <div className="flex-grow w-full space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Nombre de Sección</label>
                  <input
                    type="text"
                    value={cat.label}
                    onChange={e => {
                      setCategories(prev => prev.map((c, i) => i === idx ? { ...c, label: e.target.value } : c));
                    }}
                    onBlur={e => {
                      const val = e.target.value.trim();
                      if (!val) {
                        toast.error("El nombre de la sección no puede estar vacío");
                        return;
                      }
                      const list = categories.map((c, i) => i === idx ? { ...c, label: val } : c);
                      setCategories(list);
                      saveCategoriesToDb(list);
                    }}
                    placeholder="Ej: Aprobación oficial Soacha"
                    className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-200 font-bold text-sm text-gray-800"
                  />
                </div>

                {/* Icon Dropdown */}
                <div className="w-full md:w-[180px] space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Icono</label>
                  <select
                    value={cat.icon || 'file'}
                    onChange={e => {
                      const list = categories.map((c, i) => i === idx ? { ...c, icon: e.target.value } : c);
                      setCategories(list);
                      saveCategoriesToDb(list);
                    }}
                    className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-200 font-bold text-sm text-gray-850"
                  >
                    <option value="file">📄 Archivo / Documento</option>
                    <option value="shield">🛡️ Escudo / Programa</option>
                    <option value="scale">⚖️ Balanza / Normas</option>
                    <option value="gavel">🔨 Mazo / Legalidad</option>
                    <option value="signature">✍️ Firma / Resoluciones</option>
                    <option value="book">📖 Libro / Manuales</option>
                  </select>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => {
                    const hasDocs = docs.some(d => d.category_key === cat.key);
                    if (hasDocs) {
                      alert(`No se puede eliminar la sección "${cat.label}" porque contiene documentos. Por favor, mueva o elimine los documentos de esta sección en la pestaña respectiva antes de intentar eliminarla.`);
                      return;
                    }
                    if (!confirm(`¿Está seguro que desea eliminar la sección "${cat.label}"?`)) {
                      return;
                    }
                    const list = categories.filter((_, i) => i !== idx);
                    setCategories(list);
                    saveCategoriesToDb(list);
                    toast.success("Sección eliminada");
                  }}
                  className="p-3 bg-white hover:bg-red-50 text-red-500 rounded-xl border border-red-100 hover:border-red-250 mt-5 md:mt-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Cambios guardados automáticamente en la base de datos
            </p>
          </div>
        </div>
      ) : (
        /* Documents View */
        <>
          {/* Header and Add Button */}
          <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-premium border border-gray-50">
            <div>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">
                Documentos en: <span className="text-fsm-red">{categories.find(c => c.key === activeTab)?.label}</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                {currentDocs.length} documentos encontrados en esta categoría
              </p>
            </div>
            <button
              onClick={() => {
                setIsAdding(!isAdding);
                setNewDoc({ title: '', type: 'upload', file_name: '', file_base64: '', external_link: '' });
              }}
              className="bg-fsm-red text-white px-5 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 font-black text-[10px] tracking-widest uppercase"
            >
              {isAdding ? "Cancelar" : <><Plus size={14} /> Agregar Documento</>}
            </button>
          </div>

          {/* Add Document Panel */}
          {isAdding && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border-2 border-fsm-red/15 animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
              <h4 className="text-fsm-red font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <Plus size={16} /> Crear Nuevo Documento
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                    Título del Documento (Cómo se mostrará al público)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Ej: Manual de Convivencia Institucional"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                      value={newDoc.title}
                      onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                    Tipo de Fuente
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewDoc({ ...newDoc, type: 'upload' })}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        newDoc.type === 'upload'
                          ? 'bg-fsm-blue text-white border-fsm-blue shadow-md'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-white'
                      }`}
                    >
                      Subir archivo PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDoc({ ...newDoc, type: 'link' })}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        newDoc.type === 'link'
                          ? 'bg-fsm-blue text-white border-fsm-blue shadow-md'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-white'
                      }`}
                    >
                      Enlace Web URL
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                    {newDoc.type === 'upload' ? 'Archivo PDF (Max 5MB)' : 'Enlace Web URL'}
                  </label>

                  {newDoc.type === 'upload' ? (
                    <div className="relative h-14 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden hover:border-fsm-blue transition-all cursor-pointer">
                      <span className="text-xs font-bold text-gray-500 px-4 truncate">
                        {newDoc.file_name ? `✓ ${newDoc.file_name}` : "Seleccionar Archivo PDF"}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e)}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Ej: https://ejemplo.com/documento.pdf"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-fsm-red font-bold text-sm"
                        value={newDoc.external_link}
                        onChange={e => setNewDoc({ ...newDoc, external_link: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-150">
                <button
                  onClick={handleAdd}
                  disabled={loading['adding']}
                  className="bg-fsm-red text-white px-8 py-4 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 font-black text-xs tracking-widest uppercase disabled:opacity-50"
                >
                  {loading['adding'] ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Crear e Insertar Documento
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Documents List */}
          <div className="space-y-4">
            {currentDocs.length === 0 ? (
              <div className="bg-white p-16 rounded-[2.5rem] border border-gray-100 text-center shadow-premium">
                <AlertCircle className="mx-auto text-gray-300 mb-3" size={32} />
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">No hay documentos en esta categoría</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Haz clic en "Agregar Documento" para crear uno</p>
              </div>
            ) : (
              currentDocs.map((doc, idx) => {
                const hasLocalUpload = !!doc.file_base64;
                const isSavedFile = !!doc.file_name && !hasLocalUpload;
                const isLink = !doc.file_name && !!doc.external_link;

                return (
                  <div
                    key={doc.id}
                    className="bg-white p-6 rounded-[2.5rem] shadow-premium border border-gray-50 hover:border-fsm-blue/15 transition-all group"
                  >
                    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                      {/* File/Link Indicator Icon */}
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 text-fsm-blue group-hover:bg-fsm-blue group-hover:text-white transition-all">
                        {isLink ? <Link2 size={20} className="text-fsm-red" /> : <FileText size={20} className="text-fsm-blue" />}
                      </div>

                      {/* Inputs Section */}
                      <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Título del Documento</label>
                          <input
                            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-fsm-blue focus:ring-2 focus:ring-fsm-blue outline-none"
                            value={doc.title}
                            onChange={e => handleUpdateLocal(doc.id, 'title', e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            {isLink ? 'Enlace URL' : 'Archivo PDF'}
                          </label>
                          
                          {isLink ? (
                            <div className="relative">
                              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                              <input
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-gray-500 focus:ring-2 focus:ring-fsm-blue outline-none"
                                value={doc.external_link || ''}
                                onChange={e => handleUpdateLocal(doc.id, 'external_link', e.target.value)}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="flex-1 relative h-[44px] bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden hover:border-fsm-blue transition-all cursor-pointer">
                                <span className="text-xs font-bold text-gray-500 truncate px-4 flex items-center gap-2">
                                  {hasLocalUpload ? (
                                    <><FileCheck className="text-green-500 animate-pulse" size={14} /> {doc.file_name} (Pendiente)</>
                                  ) : isSavedFile ? (
                                    <><FileCheck className="text-fsm-blue" size={14} /> {doc.file_name}</>
                                  ) : (
                                    <><Upload size={14} /> Subir PDF</>
                                  )}
                                </span>
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={(e) => handleFileChange(e, doc.id)}
                                />
                              </div>

                              <button
                                title="Cambiar a Enlace URL"
                                onClick={() => {
                                  handleUpdateLocal(doc.id, 'file_name', undefined);
                                  handleUpdateLocal(doc.id, 'file_base64', undefined);
                                  handleUpdateLocal(doc.id, 'external_link', '#');
                                }}
                                className="h-[44px] px-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 hover:text-fsm-red transition-all"
                              >
                                <Link2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Category Selector inside Document details to allow moving them easily */}
                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Mover a Sección</label>
                          <select
                            value={doc.category_key}
                            onChange={e => handleUpdateLocal(doc.id, 'category_key', e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 font-bold text-sm text-fsm-blue focus:ring-2 focus:ring-fsm-blue outline-none"
                          >
                            {categories.map(cat => (
                              <option key={cat.key} value={cat.key}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Action and Reordering Buttons */}
                      <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 border-gray-50 pt-4 lg:pt-0">
                        <div className="flex gap-1 mr-2">
                          <button
                            onClick={() => moveOrder(idx, 'up')}
                            disabled={idx === 0}
                            className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-500 hover:text-fsm-blue hover:bg-gray-100 transition-all disabled:opacity-30"
                            title="Subir orden"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveOrder(idx, 'down')}
                            disabled={idx === currentDocs.length - 1}
                            className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-500 hover:text-fsm-blue hover:bg-gray-100 transition-all disabled:opacity-30"
                            title="Bajar orden"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => saveUpdate(doc.id)}
                          disabled={loading[doc.id]}
                          className="p-3 bg-green-50 text-green-600 rounded-xl border border-green-100 hover:bg-green-100 transition-all active:scale-95 shadow-sm"
                          title="Guardar Cambios"
                        >
                          {loading[doc.id] ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : success[doc.id] ? (
                            <CheckCircle size={16} />
                          ) : (
                            <Save size={16} />
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={loading[doc.id]}
                          className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-all active:scale-95 shadow-sm"
                          title="Eliminar Documento"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
