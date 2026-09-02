'use client';

import React, { useState, useTransition } from 'react';
import { 
  ShieldCheck, Activity, Search, Filter, Calendar, Download, RefreshCw, 
  User, Globe, Clock, CheckCircle2, AlertTriangle, Lock, Eye, ArrowRight,
  FileSpreadsheet, Sparkles, Smartphone, Laptop, Check, X
} from 'lucide-react';
import { getAuditLogsAction } from '@/app/actions';
import { exportAuditLogsToExcel } from '@/lib/excelExportHelper';

export interface AuditLogItem {
  id: string;
  user_email: string;
  user_role?: string;
  user_name?: string;
  action: string;
  category: string;
  details: string;
  metadata?: any;
  ip_address?: string;
  city?: string;
  country?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditStats {
  logins_today: number;
  attendance_changes_today: number;
  unique_ips: number;
  unique_users: number;
}

interface AuditLogsClientProps {
  initialLogs: AuditLogItem[];
  initialTotal: number;
  initialUsers: string[];
  initialStats: AuditStats;
}

const CATEGORY_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  AUTH: { label: 'Seguridad / Acceso', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  ATTENDANCE: { label: 'Asistencia y Excusas', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  STUDENTS: { label: 'Estudiantes', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  USERS: { label: 'Gestión de Usuarios', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  SYSTEM: { label: 'Sistema', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  CONTENT: { label: 'Contenido Web', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

function formatTimestamp(isoStr: string) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return isoStr;
  }
}

function parseDevice(ua?: string) {
  if (!ua) return { isMobile: false, os: 'Desconocido', browser: 'Desconocido', summary: 'Desconocido' };
  const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isWindows = /Windows NT/i.test(ua);
  const isLinux = /Linux/i.test(ua);

  let os = 'OS';
  if (isMac) os = 'macOS';
  else if (isWindows) os = 'Windows';
  else if (isLinux) os = 'Linux';
  else if (/iPhone/i.test(ua)) os = 'iPhone iOS';
  else if (/Android/i.test(ua)) os = 'Android';

  let browser = 'Browser';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  return { isMobile, os, browser, summary: `${browser} en ${os}` };
}

export default function AuditLogsClient({
  initialLogs,
  initialTotal,
  initialUsers,
  initialStats,
}: AuditLogsClientProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState<AuditStats>(initialStats);
  const [usersList] = useState<string[]>(initialUsers);

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [userEmailFilter, setUserEmailFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isPending, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const fetchLogs = (targetPage: number = 1) => {
    startTransition(async () => {
      const res = await getAuditLogsAction({
        page: targetPage,
        limit,
        userEmail: userEmailFilter,
        category: categoryFilter,
        action: actionFilter,
        startDate,
        endDate,
        search: searchQuery
      });

      if (res.success && res.logs) {
        setLogs(res.logs);
        setTotal(res.total || 0);
        setPage(targetPage);
        if (res.stats) setStats(res.stats);
      }
    });
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setUserEmailFilter('');
    setCategoryFilter('ALL');
    setActionFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    startTransition(async () => {
      const res = await getAuditLogsAction({ page: 1, limit: 50 });
      if (res.success && res.logs) {
        setLogs(res.logs);
        setTotal(res.total || 0);
        setPage(1);
        if (res.stats) setStats(res.stats);
      }
    });
  };

  const handleSoloHoy = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    startTransition(async () => {
      const res = await getAuditLogsAction({
        page: 1,
        limit,
        userEmail: userEmailFilter,
        category: categoryFilter,
        action: actionFilter,
        startDate: today,
        endDate: today,
        search: searchQuery
      });
      if (res.success && res.logs) {
        setLogs(res.logs);
        setTotal(res.total || 0);
        setPage(1);
        if (res.stats) setStats(res.stats);
      }
    });
  };

  const isSoloHoyActive = Boolean(startDate && endDate && startDate === endDate && startDate === new Date().toISOString().split('T')[0]);

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleExportExcel = async () => {
    try {
      await exportAuditLogsToExcel(logs);
    } catch (err) {
      console.error('Error exporting audit logs Excel:', err);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Superadmin Header */}
      <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-indigo-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-black tracking-widest uppercase mb-3">
              <ShieldCheck size={14} className="text-indigo-400" />
              Módulo de Superadministrador • Auditoría Total
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              📜 Registro de Auditoría & LOGS
            </h1>
            <p className="text-slate-300 text-xs md:text-sm font-medium mt-1 max-w-2xl">
              Monitoreo y trazabilidad en tiempo real de todos los inicios de sesión, IPs, horarios y modificaciones realizadas en la plataforma por cualquier usuario.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchLogs(page)}
              disabled={isPending}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg"
            >
              <FileSpreadsheet size={16} />
              Exportar a Excel
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
            <div className="text-[10px] font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
              <Lock size={12} /> Logins Hoy
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.logins_today}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
            <div className="text-[10px] font-black uppercase text-emerald-300 tracking-wider flex items-center gap-1.5">
              <Activity size={12} /> Cambios de Asistencia Hoy
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.attendance_changes_today}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
            <div className="text-[10px] font-black uppercase text-sky-300 tracking-wider flex items-center gap-1.5">
              <Globe size={12} /> IPs Distintas
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.unique_ips}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
            <div className="text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1.5">
              <User size={12} /> Usuarios con Actividad
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.unique_users}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <form onSubmit={handleFilterSubmit} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-fsm-blue flex items-center gap-2">
            <Filter size={15} /> Filtros de Auditoría
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] font-bold text-gray-500 hover:text-fsm-red transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* User Email Select */}
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Usuario / Email</label>
            <select
              value={userEmailFilter}
              onChange={(e) => setUserEmailFilter(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
            >
              <option value="">Todos los Usuarios</option>
              {usersList.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="AUTH">AUTH (Inicios / Cierres de Sesión)</option>
              <option value="ATTENDANCE">ATTENDANCE (Asistencias / Excusas)</option>
              <option value="USERS">USERS (Gestión de Cuentas)</option>
              <option value="STUDENTS">STUDENTS (Matrícula / Alumnos)</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
            />
          </div>

          {/* Text Search */}
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Buscar Detalle / IP</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej. IP, alumno, excusa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Action Row matching attendance filters */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-gray-100">
          {/* Solo Hoy Button */}
          <button
            type="button"
            onClick={handleSoloHoy}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border transition-all flex items-center gap-1.5 shrink-0 ${
              isSoloHoyActive
                ? 'bg-fsm-blue text-white border-fsm-blue shadow-sm'
                : 'bg-blue-50/60 text-fsm-blue border-blue-200 hover:bg-fsm-blue hover:text-white'
            }`}
          >
            <Calendar size={14} />
            <span>📅 Solo Hoy</span>
          </button>

          {/* Refresh / Update Button */}
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:cursor-wait disabled:hover:bg-fsm-blue shadow-sm shrink-0"
          >
            <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </form>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600">
          <div>
            Mostrando <strong>{logs.length}</strong> de <strong>{total}</strong> registros de auditoría
          </div>
          {isPending && (
            <div className="flex items-center gap-2 text-fsm-blue">
              <RefreshCw size={13} className="animate-spin" />
              <span>Cargando registros...</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
              <tr>
                <th className="p-3.5 text-center w-12">#</th>
                <th className="p-3.5 min-w-[150px]">Fecha y Hora (Bogotá)</th>
                <th className="p-3.5 min-w-[200px]">Usuario Responsable</th>
                <th className="p-3.5 min-w-[140px]">Acción / Categoría</th>
                <th className="p-3.5 min-w-[320px]">Detalle del Cambio</th>
                <th className="p-3.5 min-w-[140px]">Dirección IP</th>
                <th className="p-3.5 min-w-[160px]">Dispositivo / Navegador</th>
                <th className="p-3.5 text-center min-w-[80px]">Inspeccionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-400">
                    <Clock size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-sm text-gray-600">No se encontraron registros de auditoría</p>
                    <p className="text-xs text-gray-400 mt-1">Intenta ajustando los filtros de fecha o búsqueda.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => {
                  const catBadge = CATEGORY_BADGES[log.category] || CATEGORY_BADGES.SYSTEM;
                  const dev = parseDevice(log.user_agent);
                  const isSuccessLogin = log.action === 'LOGIN_EXITOSO';
                  const isFailLogin = log.action === 'LOGIN_FALLIDO' || log.action === 'LOGIN_BLOQUEADO';

                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isFailLogin ? 'bg-red-50/30' : isSuccessLogin ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Row Index */}
                      <td className="p-3.5 text-center font-bold text-gray-400 border-r border-gray-100">
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* Timestamp */}
                      <td className="p-3.5 font-bold text-gray-800 border-r border-gray-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-gray-400 shrink-0" />
                          <span>{formatTimestamp(log.created_at)}</span>
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="p-3.5 border-r border-gray-100">
                        <div className="font-bold text-gray-900 truncate max-w-[200px]" title={log.user_email}>
                          {log.user_name || log.user_email}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span className="truncate max-w-[160px]">{log.user_email}</span>
                          {log.user_role && (
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-black text-[9px] uppercase">
                              {log.user_role}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action & Category */}
                      <td className="p-3.5 border-r border-gray-100 whitespace-nowrap">
                        <div className="font-black text-xs text-gray-800">
                          {log.action}
                        </div>
                        <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md border mt-1 ${catBadge.bg} ${catBadge.text} ${catBadge.border}`}>
                          {catBadge.label}
                        </span>
                      </td>

                      {/* Change Details */}
                      <td className="p-3.5 font-medium text-gray-800 border-r border-gray-100">
                        <div className="line-clamp-2 text-xs leading-relaxed" title={log.details}>
                          {log.details}
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="p-3.5 border-r border-gray-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono font-bold">
                            {log.ip_address || '127.0.0.1'}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyIp(log.ip_address || '127.0.0.1')}
                            title="Copiar IP"
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                          >
                            {copiedIp === (log.ip_address || '127.0.0.1') ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Globe size={12} />
                            )}
                          </button>
                        </div>
                        {(log.city || log.country) && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {log.city ? `${log.city}, ` : ''}{log.country || 'Colombia'}
                          </div>
                        )}
                      </td>

                      {/* Device / User Agent */}
                      <td className="p-3.5 border-r border-gray-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-gray-700 text-[11px]">
                          {dev.isMobile ? <Smartphone size={13} className="text-sky-600" /> : <Laptop size={13} className="text-indigo-600" />}
                          <span>{dev.summary}</span>
                        </div>
                      </td>

                      {/* Inspect Button */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-fsm-blue hover:text-white text-gray-700 rounded-xl font-bold text-xs transition-all inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Eye size={13} />
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({total} eventos registrados)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1 || isPending}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-all"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages || isPending}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Inspección de Registro de Auditoría
                </div>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  {selectedLog.action}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-gray-400 block">Usuario Responsable</span>
                <span className="font-bold text-gray-900">{selectedLog.user_name || 'N/A'}</span>
                <div className="text-gray-500">{selectedLog.user_email}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-gray-400 block">Fecha y Hora Exacta</span>
                <span className="font-bold text-gray-900">{formatTimestamp(selectedLog.created_at)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-gray-400 block">Dirección IP y Ubicación</span>
                <code className="font-bold text-gray-900">{selectedLog.ip_address || '127.0.0.1'}</code>
                <div className="text-gray-500">{selectedLog.city ? `${selectedLog.city}, ` : ''}{selectedLog.country || 'Colombia'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-gray-400 block">Dispositivo</span>
                <span className="font-bold text-gray-900">{parseDevice(selectedLog.user_agent).summary}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Descripción del Cambio</span>
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs font-bold text-blue-950 leading-relaxed">
                {selectedLog.details}
              </div>
            </div>

            {selectedLog.metadata && (
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Payload / Metadatos Estructurados</span>
                <pre className="p-3.5 bg-gray-900 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">User Agent Completo</span>
              <div className="p-2.5 bg-gray-100 rounded-xl text-[10px] font-mono text-gray-600 break-all">
                {selectedLog.user_agent || 'N/A'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase transition-all"
            >
              Cerrar Inspección
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
