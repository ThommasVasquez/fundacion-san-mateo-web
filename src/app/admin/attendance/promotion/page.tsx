import React from 'react';
import Link from 'next/link';
import { sql } from '@/lib/db';
import PromotionClient from './PromotionClient';
import { ArrowLeft, ChevronRight, GraduationCap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PromotionPage() {
  // 1. Consultar todos los grupos disponibles con su conteo de estudiantes
  const groupsRes = await sql`
    SELECT g.id, g.nombre, g.jornada, g.tipo,
           COUNT(e.id)::int as enrolled_count
    FROM groups g
    LEFT JOIN enrollments e ON e.group_id = g.id AND (e.activo IS NULL OR e.activo = TRUE)
    GROUP BY g.id, g.nombre, g.jornada, g.tipo
    ORDER BY g.nombre ASC
  `;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-700">
        <Link href="/admin/attendance" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <ArrowLeft size={14} /> Asistencia
        </Link>
        <ChevronRight size={14} />
        <Link href="/admin/attendance/enrollment" className="hover:text-fsm-red transition-colors">
          Matrícula
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Promoción de Semestre</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-fsm-blue/10 text-fsm-blue flex items-center justify-center">
              <GraduationCap size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-fsm-blue uppercase tracking-tight">
              Promoción y Cierre de Semestre
            </h1>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm font-medium mt-1">
            Gestiona el paso de estudiantes al siguiente semestre, repitencias y retiros conservando el historial y actualizando el acceso físico.
          </p>
        </div>

        <Link
          href="/admin/attendance/enrollment"
          className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Volver a Gestión de Estudiantes
        </Link>
      </div>

      {/* Promotion Interactive Client */}
      <PromotionClient groups={groupsRes.map((g: any) => ({
        id: g.id,
        nombre: g.nombre,
        jornada: g.jornada,
        tipo: g.tipo,
        enrolled_count: Number(g.enrolled_count) || 0
      }))} />
    </div>
  );
}
