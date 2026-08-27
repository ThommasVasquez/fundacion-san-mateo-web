/**
 * Formatea cualquier fecha (String, Date o timestamp) al formato estándar institucional dd/mm/yyyy.
 * Ejemplo: '2026-08-26T12:00:00Z' => '26/08/2026'
 */
export function formatDateDDMMYYYY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const str = dateInput instanceof Date ? dateInput.toISOString() : String(dateInput);

    // 1. Handling YYYY-MM-DD or YYYY-MM-DDT00:00:00... (Pure Calendar Dates)
    const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00|\s+00:00:00)?/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return `${day}/${month}/${year}`;
    }

    // 2. Handling Timestamps with actual time component
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;

    const parts = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(d);

    const day = parts.find((p) => p.type === 'day')?.value || '01';
    const month = parts.find((p) => p.type === 'month')?.value || '01';
    const year = parts.find((p) => p.type === 'year')?.value || '2026';

    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}
