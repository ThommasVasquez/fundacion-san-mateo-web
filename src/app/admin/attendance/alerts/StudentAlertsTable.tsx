'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, ChevronLeft, Search } from 'lucide-react';

export interface StudentAlertItem {
  student_id: string;
  student_name: string;
  group_name: string;
  group_id: string;
  total_sessions: number | string;
  total_absences: number | string;
  total_presents?: number | string;
  absence_rate: number | string;
}

interface StudentAlertsTableProps {
  alerts: StudentAlertItem[];
}

export default function StudentAlertsTable({ alerts }: StudentAlertsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;

  // Filter based on search term
  const filteredAlerts = useMemo(() => {
    if (!searchTerm.trim()) return alerts;
    const term = searchTerm.toLowerCase();
    return alerts.filter(
      (item) =>
        item.student_name.toLowerCase().includes(term) ||
        item.group_name.toLowerCase().includes(term)
    );
  }, [alerts, searchTerm]);

  // Reset to page 1 if filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredAlerts.length);
  const currentItems = filteredAlerts.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Header controls: Search & Count summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="text-xs font-bold text-gray-500">
          Mostrando{' '}
          <span className="text-fsm-blue font-black">
            {filteredAlerts.length === 0 ? 0 : startIndex + 1}–{endIndex}
          </span>{' '}
          de <span className="font-black text-gray-800">{filteredAlerts.length}</span> estudiantes en riesgo
          {filteredAlerts.length !== alerts.length && (
            <span className="text-gray-400 font-normal"> (filtrados de un total de {alerts.length})</span>
          )}
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por alumno o grupo..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-fsm-blue focus:bg-white transition-all"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
              <th className="py-3 px-4">Estudiante</th>
              <th className="py-3 px-4">Grupo</th>
              <th className="py-3 px-4 text-center">Sesiones Evaluadas</th>
              <th className="py-3 px-4 text-center">Inasistencias</th>
              <th className="py-3 px-4 text-center">% Ausentismo</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium bg-white">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  No se encontraron estudiantes que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              currentItems.map((row) => (
                <tr key={row.student_id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-800">{row.student_name}</td>
                  <td className="py-3 px-4">
                    <span className="bg-blue-50 text-fsm-blue font-bold px-2.5 py-1 rounded-lg border border-blue-200">
                      {row.group_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-700">{row.total_sessions}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-red-50 text-fsm-red font-black px-2.5 py-1 rounded-lg border border-red-200">
                      {row.total_absences} Faltas
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-black text-amber-600 text-sm">
                    {row.absence_rate}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/attendance/students/${row.student_id}`}
                      className="inline-flex items-center gap-1 text-fsm-blue font-bold hover:underline"
                    >
                      Ver Historial <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-gray-500 font-medium">
            Página <span className="font-bold text-gray-800">{currentPage}</span> de{' '}
            <span className="font-bold text-gray-800">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Anterior
            </button>

            {/* Numeric page buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-xs text-gray-400">…</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          currentPage === p
                            ? 'bg-fsm-blue text-white shadow-sm font-black'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
