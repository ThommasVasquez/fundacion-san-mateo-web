'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Calendar, Filter, ArrowUpDown, RefreshCw } from 'lucide-react';

interface AttendanceFiltersProps {
  filterSearch: string;
  filterStartDate: string;
  filterEndDate: string;
  filterSede: string;
  filterGrado: string;
  filterSort: string;
  filterAnomalyOnly: boolean;
  filterAbsencesOnly: boolean;
  todayStr: string;
  grades: string[];
  totalAnomalies: number;
  totalRealAbsencesCount: number;
  absencesListLength: number;
}

export default function AttendanceFilters({
  filterSearch,
  filterStartDate,
  filterEndDate,
  filterSede,
  filterGrado,
  filterSort,
  filterAnomalyOnly,
  filterAbsencesOnly,
  todayStr,
  grades,
  totalAnomalies,
  totalRealAbsencesCount,
  absencesListLength,
}: AttendanceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state for instant input feedback
  const [search, setSearch] = useState(filterSearch);
  const [startDate, setStartDate] = useState(filterStartDate);
  const [endDate, setEndDate] = useState(filterEndDate);
  const [sede, setSede] = useState(filterSede);
  const [grado, setGrado] = useState(filterGrado);
  const [sort, setSort] = useState(filterSort);
  const [anomalyOnly, setAnomalyOnly] = useState(filterAnomalyOnly);
  const [absencesOnly, setAbsencesOnly] = useState(filterAbsencesOnly);

  // Sync state when props change
  useEffect(() => {
    setSearch(filterSearch);
    setStartDate(filterStartDate);
    setEndDate(filterEndDate);
    setSede(filterSede);
    setGrado(filterGrado);
    setSort(filterSort);
    setAnomalyOnly(filterAnomalyOnly);
    setAbsencesOnly(filterAbsencesOnly);
  }, [
    filterSearch,
    filterStartDate,
    filterEndDate,
    filterSede,
    filterGrado,
    filterSort,
    filterAnomalyOnly,
    filterAbsencesOnly,
  ]);

  // Apply filters to URL
  const applyFilters = (overrides: {
    search?: string;
    startDate?: string;
    endDate?: string;
    sede?: string;
    grado?: string;
    sort?: string;
    anomalyOnly?: boolean;
    absencesOnly?: boolean;
  } = {}) => {
    const nextSearch = overrides.search !== undefined ? overrides.search : search;
    const nextStartDate = overrides.startDate !== undefined ? overrides.startDate : startDate;
    const nextEndDate = overrides.endDate !== undefined ? overrides.endDate : endDate;
    const nextSede = overrides.sede !== undefined ? overrides.sede : sede;
    const nextGrado = overrides.grado !== undefined ? overrides.grado : grado;
    const nextSort = overrides.sort !== undefined ? overrides.sort : sort;
    const nextAnomalyOnly = overrides.anomalyOnly !== undefined ? overrides.anomalyOnly : anomalyOnly;
    const nextAbsencesOnly = overrides.absencesOnly !== undefined ? overrides.absencesOnly : absencesOnly;

    const p = new URLSearchParams();
    if (nextSearch?.trim()) p.set('search', nextSearch.trim());
    if (nextStartDate) p.set('startDate', nextStartDate);
    if (nextEndDate) p.set('endDate', nextEndDate);
    if (nextSede) p.set('sede', nextSede);
    if (nextGrado) p.set('grado', nextGrado);
    if (nextSort && nextSort !== 'time_desc') p.set('sort', nextSort);
    if (nextAnomalyOnly) p.set('anomalyOnly', 'true');
    if (nextAbsencesOnly) p.set('absencesOnly', 'true');

    // Preserve studentHistoryId if present
    const currentStudentHistoryId = searchParams.get('studentHistoryId');
    if (currentStudentHistoryId) {
      p.set('studentHistoryId', currentStudentHistoryId);
    }

    const targetUrl = p.toString() ? `${pathname}?${p.toString()}` : pathname;

    startTransition(() => {
      if (targetUrl === `${window.location.pathname}${window.location.search}`) {
        router.refresh();
      } else {
        router.push(targetUrl, { scroll: false });
      }
    });
  };

  // Debounced search
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (search !== filterSearch) {
        applyFilters({ search });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Handlers for instant updates
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartDate(val);
    applyFilters({ startDate: val });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndDate(val);
    applyFilters({ endDate: val });
  };

  const handleSedeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSede(val);
    applyFilters({ sede: val });
  };

  const handleGradoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setGrado(val);
    applyFilters({ grado: val });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSort(val);
    applyFilters({ sort: val });
  };

  const handleAnomalyToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setAnomalyOnly(val);
    applyFilters({ anomalyOnly: val });
  };

  const handleAbsencesToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setAbsencesOnly(val);
    applyFilters({ absencesOnly: val });
  };

  const handleSoloHoy = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
    applyFilters({ startDate: todayStr, endDate: todayStr });
  };

  const isSoloHoyActive = startDate === todayStr && endDate === todayStr;

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium space-y-4 relative">
      {/* Row 1: Main Search, Date Range, Solo Hoy & Refresh */}
      <div className="flex flex-wrap gap-4 items-center justify-between border-b border-gray-100 pb-4">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 flex-1 min-w-[280px]">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar estudiante, UID o lector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent font-bold text-xs text-gray-700 outline-none w-full"
          />
        </div>

        {/* Date Range: Start Date */}
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
          <Calendar size={16} className="text-gray-400" />
          <span className="text-[10px] font-black uppercase text-gray-400">Desde:</span>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
          />
        </div>

        {/* Date Range: End Date */}
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
          <Calendar size={16} className="text-gray-400" />
          <span className="text-[10px] font-black uppercase text-gray-400">Hasta:</span>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
          />
        </div>

        {/* Quick Filter: Solo Hoy */}
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
          type="button"
          onClick={() => applyFilters()}
          disabled={isPending}
          aria-busy={isPending}
          className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:cursor-wait disabled:hover:bg-fsm-blue shadow-sm"
        >
          <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Row 2: Selectors & Special Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Sede Selector */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
            <span className="text-[10px] font-black uppercase text-gray-400">Sede:</span>
            <select
              value={sede}
              onChange={handleSedeChange}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
            >
              <option value="">Todas las Sedes</option>
              <option value="Sede 1">Sede 1</option>
              <option value="Sede 2">Sede 2</option>
            </select>
          </div>

          {/* Grade Selector */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
            <Filter size={16} className="text-gray-400" />
            <select
              value={grado}
              onChange={handleGradoChange}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
            >
              <option value="">Todos los Grados / Turnos</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order Selector */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
            <ArrowUpDown size={16} className="text-gray-400" />
            <select
              value={sort}
              onChange={handleSortChange}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
            >
              <option value="time_desc">Hora (Más reciente)</option>
              <option value="time_asc">Hora (Más antiguo)</option>
              <option value="name_asc">Nombre (A - Z)</option>
              <option value="name_desc">Nombre (Z - A)</option>
              <option value="grado_asc">Grado (A - Z)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Anomaly Checkbox */}
          <label
            className={`flex items-center gap-2 cursor-pointer font-bold text-xs uppercase select-none px-3.5 py-2 rounded-xl border transition-all ${
              anomalyOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm font-black'
                : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'
            }`}
          >
            <input
              type="checkbox"
              checked={anomalyOnly}
              onChange={handleAnomalyToggle}
              className="w-4 h-4 rounded border-gray-300 text-fsm-red focus:ring-fsm-red cursor-pointer"
            />
            <span>Solo Sin Asignar ({totalAnomalies})</span>
          </label>

          {/* Absences Only Checkbox */}
          <label
            className={`flex items-center gap-2 cursor-pointer font-bold text-xs uppercase select-none px-3.5 py-2 rounded-xl border transition-all ${
              absencesOnly
                ? 'bg-red-100 text-fsm-red border-red-300 shadow-sm font-black'
                : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'
            }`}
          >
            <input
              type="checkbox"
              checked={absencesOnly}
              onChange={handleAbsencesToggle}
              className="w-4 h-4 rounded border-red-300 text-fsm-red focus:ring-fsm-red cursor-pointer"
            />
            <span>
              ❌ Solo Inasistencias ({absencesOnly ? absencesListLength : totalRealAbsencesCount})
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
