import React from 'react';
import Link from 'next/link';
import { sql } from '@/lib/db';
import SimulatorClient from './SimulatorClient';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SimulatorPage() {
  // 1. Fetch students
  const students = await sql`
    SELECT id, nombre, rfid_tag_uid, grado 
    FROM students 
    ORDER BY grado, nombre
  `;

  // 2. Fetch readers
  const readers = await sql`
    SELECT id, tipo, ubicacion 
    FROM readers 
    ORDER BY tipo, ubicacion
  `;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-700 mb-4">
        <Link href="/admin" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <ArrowLeft size={14} /> Panel
        </Link>
        <ChevronRight size={14} />
        <Link href="/admin/attendance" className="hover:text-fsm-red transition-colors">
          Asistencia
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Simulador de Lectores</span>
      </div>

      <div>
        <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mb-2">SIMULADOR DE HARDWARE</h1>
        <p className="text-gray-900 font-medium">Prueba la integración del backend simulando escaneos de tarjetas RFID y terminales móviles.</p>
      </div>

      <SimulatorClient 
        students={students.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          rfid_tag_uid: s.rfid_tag_uid,
          grado: s.grado
        }))} 
        readers={readers.map((r: any) => ({
          id: r.id,
          tipo: r.tipo,
          ubicacion: r.ubicacion
        }))}
      />
    </div>
  );
}
