/**
 * Catálogo Oficial de Programas Académicos, Grupos, Jornadas y Flujos de Promoción
 * Fundación San Mateo Educación Superior
 */

export type ProgramCode = 'PREESCOLAR' | 'TAE' | 'AIPI';
export type ShiftType = 'DIURNO' | 'NOCHE' | 'SABADO';
export type CalendarType = 'REGULAR' | 'CB'; // CB = Calendario B

export interface AcademicProgramDefinition {
  code: ProgramCode;
  name: string;
  shortName: string;
  durationSemesters: number;
  icon: string;
}

export interface AcademicGroupDefinition {
  name: string;
  programCode: ProgramCode;
  programName: string;
  semester: 'I' | 'II' | 'III';
  shift: ShiftType;
  calendar: CalendarType;
  nextGroupName: string | 'EGRESADO';
}

export const ACADEMIC_PROGRAMS: Record<ProgramCode, AcademicProgramDefinition> = {
  PREESCOLAR: {
    code: 'PREESCOLAR',
    name: 'Técnico Auxiliar en Preescolar',
    shortName: 'Preescolar',
    durationSemesters: 2,
    icon: '🎒'
  },
  AIPI: {
    code: 'AIPI',
    name: 'Atención Integral a la Primera Infancia (AIPI)',
    shortName: 'Primera Infancia AIPI',
    durationSemesters: 2,
    icon: '👶'
  },
  TAE: {
    code: 'TAE',
    name: 'Técnico Auxiliar en Enfermería (TAE)',
    shortName: 'Enfermería TAE',
    durationSemesters: 3,
    icon: '🩺'
  }
};

/**
 * Los 19 Grupos Oficiales de la Institución con su flujo de progresión
 */
export const OFFICIAL_GROUPS: AcademicGroupDefinition[] = [
  // 🎒 PREESCOLAR (2 grupos, Diurno)
  {
    name: 'I PREESCOLAR',
    programCode: 'PREESCOLAR',
    programName: 'Preescolar',
    semester: 'I',
    shift: 'DIURNO',
    calendar: 'REGULAR',
    nextGroupName: 'II PREESCOLAR'
  },
  {
    name: 'II PREESCOLAR',
    programCode: 'PREESCOLAR',
    programName: 'Preescolar',
    semester: 'II',
    shift: 'DIURNO',
    calendar: 'REGULAR',
    nextGroupName: 'EGRESADO'
  },

  // 👶 PRIMERA INFANCIA AIPI (2 grupos, Diurno)
  {
    name: 'I AIPI',
    programCode: 'AIPI',
    programName: 'Primera Infancia AIPI',
    semester: 'I',
    shift: 'DIURNO',
    calendar: 'REGULAR',
    nextGroupName: 'II AIPI'
  },
  {
    name: 'II AIPI',
    programCode: 'AIPI',
    programName: 'Primera Infancia AIPI',
    semester: 'II',
    shift: 'DIURNO',
    calendar: 'REGULAR',
    nextGroupName: 'EGRESADO'
  },

  // 🩺 ENFERMERÍA TAE - DIURNO REGULAR
  {
    name: 'I DIURNO A',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'I',
    shift: 'DIURNO',
    calendar: 'REGULAR',
    nextGroupName: 'II DIURNO A'
  },
  {
    name: 'II DIURNO A',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'II',
    shift: 'DIURNO',
    calendar: 'REGULAR',
    nextGroupName: 'III DIURNO A'
  },
  {
    name: 'II DIURNO B',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'II',
    shift: 'DIURNO',
    calendar: 'REGULAR',
    nextGroupName: 'III DIURNO A'
  },
  {
    name: 'III DIURNO A',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'III',
    shift: 'DIURNO',
    calendar: 'REGULAR',
    nextGroupName: 'EGRESADO'
  },

  // 🩺 ENFERMERÍA TAE - DIURNO CALENDARIO B (CB)
  {
    name: 'I DIURNO CB',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'I',
    shift: 'DIURNO',
    calendar: 'CB',
    nextGroupName: 'II DIURNO A CB'
  },
  {
    name: 'II DIURNO A CB',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'II',
    shift: 'DIURNO',
    calendar: 'CB',
    nextGroupName: 'III DIURNO A'
  },

  // 🩺 ENFERMERÍA TAE - NOCTURNO REGULAR
  {
    name: 'I NOCHE A',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'I',
    shift: 'NOCHE',
    calendar: 'REGULAR',
    nextGroupName: 'II NOCHE A'
  },
  {
    name: 'II NOCHE A',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'II',
    shift: 'NOCHE',
    calendar: 'REGULAR',
    nextGroupName: 'III NOCHE A'
  },
  {
    name: 'III NOCHE A',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'III',
    shift: 'NOCHE',
    calendar: 'REGULAR',
    nextGroupName: 'EGRESADO'
  },

  // 🩺 ENFERMERÍA TAE - NOCTURNO CALENDARIO B (CB)
  {
    name: 'I NOCHE CB',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'I',
    shift: 'NOCHE',
    calendar: 'CB',
    nextGroupName: 'II NOCHE A'
  },

  // 🩺 ENFERMERÍA TAE - SÁBADO REGULAR
  {
    name: 'I SABADO A',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'I',
    shift: 'SABADO',
    calendar: 'REGULAR',
    nextGroupName: 'II SABADO A'
  },
  {
    name: 'II SABADO A',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'II',
    shift: 'SABADO',
    calendar: 'REGULAR',
    nextGroupName: 'III SABADO A'
  },
  {
    name: 'III SABADO A',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'III',
    shift: 'SABADO',
    calendar: 'REGULAR',
    nextGroupName: 'EGRESADO'
  },
  {
    name: 'III SABADO B',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'III',
    shift: 'SABADO',
    calendar: 'REGULAR',
    nextGroupName: 'EGRESADO'
  },

  // 🩺 ENFERMERÍA TAE - SÁBADO CALENDARIO B (CB)
  {
    name: 'II SABADO CB',
    programCode: 'TAE',
    programName: 'Enfermería TAE',
    semester: 'II',
    shift: 'SABADO',
    calendar: 'CB',
    nextGroupName: 'III SABADO A'
  }
];

/**
 * Normaliza nombres antiguos o variaciones (ej: 'I DIURNO A CB' -> 'I DIURNO CB')
 */
export function normalizeGroupName(rawName: string): string {
  if (!rawName) return '';
  const clean = rawName.toUpperCase().replace(/\s+/g, ' ').trim();

  // Mapeos de variaciones comunes
  if (clean === 'I DIURNO A CB' || clean === 'I DIURRNO A CB' || clean === 'I DA CB') return 'I DIURNO CB';
  if (clean === 'I DIURNO B CB' || clean === 'I DB CB') return 'II DIURNO A CB';
  if (clean === 'I SABADO CB' || clean === 'ISB CB') return 'II SABADO CB';
  if (clean === 'I NOCHE A CB') return 'I NOCHE CB';
  if (clean === '1 AIPI') return 'I AIPI';
  if (clean === '2 AIPI') return 'II AIPI';
  if (clean === '1 PREESCOLAR' || clean === '1 PREEESCOLAR') return 'I PREESCOLAR';
  if (clean === '2 PREESCOLAR') return 'II PREESCOLAR';
  if (clean === '1 DIURNO A') return 'I DIURNO A';
  if (clean === '2 DIURNO A' || clean === '2DO DIURNO A') return 'II DIURNO A';
  if (clean === '2 DIURNO B') return 'II DIURNO B';
  if (clean === '3 DIURNO A' || clean === 'III DIURNO A') return 'III DIURNO A';
  if (clean === '1 NOCHE A') return 'I NOCHE A';
  if (clean === '2 NOCHE A') return 'II NOCHE A';
  if (clean === '3 NOCHE A') return 'III NOCHE A';
  if (clean === '1 SABADO A') return 'I SABADO A';
  if (clean === '2 SABADO A') return 'II SABADO A';
  if (clean === '3 SABADO A') return 'III SABADO A';
  if (clean === '3 SABADO B' || clean === '2DO SABADO B') return 'III SABADO B';

  return clean;
}

/**
 * Encuentra la definición académica oficial de un grupo
 */
export function getAcademicGroupConfig(groupName: string): AcademicGroupDefinition | undefined {
  const normalized = normalizeGroupName(groupName);
  return OFFICIAL_GROUPS.find(g => g.name === normalized || g.name === groupName);
}

/**
 * Sugiere el grupo sucesor según la regla institucional
 */
export function getNextAcademicGroup(groupName: string): { nextGroupName: string; isFinalSemester: boolean } {
  const config = getAcademicGroupConfig(groupName);
  if (!config) {
    // Regla de fallback
    if (groupName.startsWith('III ') || groupName.startsWith('3 ')) {
      return { nextGroupName: 'EGRESADO', isFinalSemester: true };
    }
    return { nextGroupName: '', isFinalSemester: false };
  }

  return {
    nextGroupName: config.nextGroupName,
    isFinalSemester: config.nextGroupName === 'EGRESADO'
  };
}
