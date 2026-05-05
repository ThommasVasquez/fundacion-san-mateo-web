import React from "react";
import { getContentMap } from "@/lib/content";
import GlobalCMSForm from "@/components/admin/GlobalCMSForm";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export const metadata = {
  title: "Gestor Global de Contenido | FSM Admin",
};

export default async function AdminHomePage() {
  // Obtenemos los valores actuales de la base de datos
  const content = await getContentMap("/");

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-400 mb-8">
        <Link href="/admin" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <Home size={14} /> Dashboard
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Gestor Global</span>
      </div>

      <div>
        <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mb-2">GESTOR GLOBAL DE CONTENIDO</h1>
        <p className="text-gray-500 font-medium">Gestiona los textos, títulos e imágenes de todas las páginas de la institución.</p>
      </div>

      {/* Formulario Cliente Unificado */}
      <GlobalCMSForm initialContent={content} />
    </div>
  );
}
