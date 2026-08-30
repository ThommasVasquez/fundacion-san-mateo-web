/**
 * Utility to calculate official Colombian holidays (Festivos Nacionales de Colombia)
 * applying Law 51 of 1983 (Ley Emiliani) and Gregorian Easter algorithm.
 * Works dynamically for any year (2026, 2027, 2028, etc.).
 */

export interface HolidayItem {
  name: string;
  dateStr: string; // YYYY-MM-DD
}

function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function nextMonday(date: Date): Date {
  const day = date.getUTCDay();
  if (day === 1) return date; // Already Monday
  const diff = (8 - day) % 7;
  const res = new Date(date);
  res.setUTCDate(date.getUTCDate() + (diff === 0 ? 7 : diff));
  return res;
}

function addDays(date: Date, days: number): Date {
  const res = new Date(date);
  res.setUTCDate(date.getUTCDate() + days);
  return res;
}

export function getColombiaHolidays(year: number): HolidayItem[] {
  const easter = getEaster(year);

  const holidays: { name: string; date: Date }[] = [
    // 1. Fijos (No se trasladan)
    { name: 'Año Nuevo', date: new Date(Date.UTC(year, 0, 1)) },
    { name: 'Día del Trabajo', date: new Date(Date.UTC(year, 4, 1)) },
    { name: 'Día de la Independencia', date: new Date(Date.UTC(year, 6, 20)) },
    { name: 'Batalla de Boyacá', date: new Date(Date.UTC(year, 7, 7)) },
    { name: 'Inmaculada Concepción', date: new Date(Date.UTC(year, 11, 8)) },
    { name: 'Navidad', date: new Date(Date.UTC(year, 11, 25)) },

    // 2. Basados en Pascua fijos
    { name: 'Jueves Santo', date: addDays(easter, -3) },
    { name: 'Viernes Santo', date: addDays(easter, -2) },

    // 3. Ley Emiliani (Se trasladan al lunes siguiente) - Fijos de calendario
    { name: 'Reyes Magos', date: nextMonday(new Date(Date.UTC(year, 0, 6))) },
    { name: 'Día de San José', date: nextMonday(new Date(Date.UTC(year, 2, 19))) },
    { name: 'San Pedro y San Pablo', date: nextMonday(new Date(Date.UTC(year, 5, 29))) },
    { name: 'Asunción de la Virgen', date: nextMonday(new Date(Date.UTC(year, 7, 15))) },
    { name: 'Día de la Raza', date: nextMonday(new Date(Date.UTC(year, 9, 12))) },
    { name: 'Todos los Santos', date: nextMonday(new Date(Date.UTC(year, 10, 1))) },
    { name: 'Independencia de Cartagena', date: nextMonday(new Date(Date.UTC(year, 10, 11))) },

    // 4. Ley Emiliani basados en Pascua
    { name: 'Ascensión del Señor', date: nextMonday(addDays(easter, 39)) },
    { name: 'Corpus Christi', date: nextMonday(addDays(easter, 60)) },
    { name: 'Sagrado Corazón de Jesús', date: nextMonday(addDays(easter, 67)) },
  ];

  return holidays
    .map(h => ({
      name: h.name,
      dateStr: h.date.toISOString().split('T')[0]
    }))
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

const holidayMapCache = new Map<number, Map<string, string>>();

export function isColombiaHoliday(dateStr: string): { isHoliday: boolean; holidayName?: string } {
  if (!dateStr || dateStr.length < 4) return { isHoliday: false };
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(year)) return { isHoliday: false };

  if (!holidayMapCache.has(year)) {
    const holidays = getColombiaHolidays(year);
    const map = new Map<string, string>();
    holidays.forEach(h => map.set(h.dateStr, h.name));
    holidayMapCache.set(year, map);
  }

  const map = holidayMapCache.get(year)!;
  if (map.has(dateStr)) {
    return { isHoliday: true, holidayName: map.get(dateStr) };
  }
  return { isHoliday: false };
}
