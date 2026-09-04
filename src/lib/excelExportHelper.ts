'use client';

import ExcelJS from 'exceljs';

// FSM Official Brand Colors
const FSM_COLORS = {
  NAVY_DARK: '0B2545',     // Main Dark Navy
  NAVY_HEADER: '002B49',   // Primary Header Blue
  NAVY_ACCENT: '134074',   // Secondary Blue
  RED_ACCENT: 'C8102E',    // Institutional Red
  GOLD_ACCENT: 'D97706',   // Gold/Amber
  GRAY_LIGHT: 'F8FAFC',    // Zebra light row
  GRAY_BORDER: 'CBD5E1',   // Border
  TEXT_DARK: '0F172A',     // Primary Text
  TEXT_MUTED: '475569',    // Secondary Text
  
  // Status Colors
  STATUS_P_BG: 'DCFCE7',
  STATUS_P_TEXT: '166534',
  STATUS_X_BG: 'FEE2E2',
  STATUS_X_TEXT: '991B1B',
  STATUS_E_BG: 'CCFBF1',
  STATUS_E_TEXT: '115E59',
  STATUS_F_BG: 'E0E7FF',
  STATUS_F_TEXT: '3730A3',
  STATUS_PR_BG: 'E0F2FE',
  STATUS_PR_TEXT: '0369A1',
};

/**
 * Fetches the FSM Institutional logo from public/FSM.png as Base64.
 */
async function getFSMLogoBase64(): Promise<string> {
  try {
    if (typeof window === 'undefined') return '';
    const res = await fetch('/FSM.png');
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

/**
 * Saves workbook in the browser using a Blob download trigger.
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// =========================================================================
// 1. EXPORT GROUP ATTENDANCE MATRIX (Planilla de Asistencia por Grupo)
// =========================================================================

export interface MatrixExportOptions {
  groupName: string;
  jornada: string;
  tipo: string;
  periodoTitle: string;
  sessions: { id: string; fecha: string; dia_semana_texto: string }[];
  students: { id: string; documento?: string; nombre_original: string }[];
  records: Record<string, { estado: string; observaciones?: string }>;
}

export async function exportGroupMatrixToExcel(options: MatrixExportOptions) {
  const { groupName, jornada, tipo, periodoTitle, sessions, students, records } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fundación San Mateo - Sistema Académico';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Matriz_${periodoTitle.slice(0, 20)}`, {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 3, ySplit: 6 }]
  });

  const logoBase64 = await getFSMLogoBase64();
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 56, height: 56 },
    });
  }

  // Row 1: Title
  const titleRow = worksheet.getRow(1);
  titleRow.getCell(2).value = 'FUNDACIÓN SAN MATEO EDUCACIÓN SUPERIOR / TÉCNICA';
  titleRow.getCell(2).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(1, 2, 1, sessions.length + 5);
  for (let c = 1; c <= sessions.length + 5; c++) {
    titleRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_HEADER } };
  }
  titleRow.height = 28;

  // Row 2: Subtitle
  const subTitleRow = worksheet.getRow(2);
  subTitleRow.getCell(2).value = `CONTROL DE ASISTENCIA ACADÉMICA — GRUPO: ${groupName.toUpperCase()} (${periodoTitle})`;
  subTitleRow.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(2, 2, 2, sessions.length + 5);
  for (let c = 1; c <= sessions.length + 5; c++) {
    subTitleRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_ACCENT } };
  }
  subTitleRow.height = 22;

  // Row 3: Red Institutional accent line
  const accentRow = worksheet.getRow(3);
  for (let c = 1; c <= sessions.length + 5; c++) {
    accentRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.RED_ACCENT } };
  }
  accentRow.height = 4;

  // Row 4: Metadata Bar
  const metaRow = worksheet.getRow(4);
  metaRow.getCell(1).value = `Jornada: ${jornada}  |  Tipo: ${tipo}  |  Estudiantes Matriculados: ${students.length}  |  Sesiones de Clase: ${sessions.length}  |  Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
  metaRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, bold: true, color: { argb: 'FF' + FSM_COLORS.TEXT_MUTED } };
  worksheet.mergeCells(4, 1, 4, sessions.length + 5);
  metaRow.height = 20;

  // Row 5: Blank separator
  worksheet.getRow(5).height = 8;

  // Row 6: Table Headers
  const headerRow = worksheet.getRow(6);
  headerRow.getCell(1).value = '#';
  headerRow.getCell(2).value = 'DOCUMENTO';
  headerRow.getCell(3).value = 'ESTUDIANTE / ALUMNO';

  sessions.forEach((s, idx) => {
    const colNum = idx + 4;
    const dateFormatted = s.fecha ? s.fecha.split('-').reverse().slice(0, 2).join('/') : s.id;
    headerRow.getCell(colNum).value = `${dateFormatted}\n${s.dia_semana_texto.slice(0, 3).toUpperCase()}`;
  });

  const totalAbsCol = sessions.length + 4;
  const pctCol = sessions.length + 5;
  headerRow.getCell(totalAbsCol).value = 'TOTAL\nFALLAS';
  headerRow.getCell(pctCol).value = '%\nASIST.';

  headerRow.height = 32;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };

  for (let c = 1; c <= pctCol; c++) {
    const cell = headerRow.getCell(c);
    if (c === totalAbsCol) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Dark red
    } else if (c === pctCol) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }; // Dark green
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_HEADER } };
    }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF' + FSM_COLORS.NAVY_DARK } },
      bottom: { style: 'medium', color: { argb: 'FF' + FSM_COLORS.NAVY_DARK } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
    };
  }

  // Data Rows
  students.forEach((st, sIdx) => {
    const rowNum = 7 + sIdx;
    const row = worksheet.getRow(rowNum);
    const isZebra = sIdx % 2 === 1;
    const bgArgb = isZebra ? 'FF' + FSM_COLORS.GRAY_LIGHT : 'FFFFFFFF';

    row.getCell(1).value = sIdx + 1;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF' + FSM_COLORS.TEXT_MUTED } };

    row.getCell(2).value = st.documento || 'S/D';
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: 'FF' + FSM_COLORS.TEXT_DARK } };

    row.getCell(3).value = st.nombre_original;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + FSM_COLORS.TEXT_DARK } };

    let totalAbsents = 0;
    let totalLectivos = 0;

    sessions.forEach((s, sessIdx) => {
      const colNum = sessIdx + 4;
      const cell = row.getCell(colNum);
      const record = records[`${st.id}_${s.id}`];
      const estado = record?.estado || 'PRESENTE';

      let cellText = 'P';
      let fgColor = FSM_COLORS.STATUS_P_TEXT;
      let cellBg = FSM_COLORS.STATUS_P_BG;

      if (estado === 'AUSENTE') {
        cellText = 'X';
        totalAbsents++;
        totalLectivos++;
        fgColor = FSM_COLORS.STATUS_X_TEXT;
        cellBg = FSM_COLORS.STATUS_X_BG;
      } else if (estado === 'PRESENTE') {
        cellText = 'P';
        totalLectivos++;
        fgColor = FSM_COLORS.STATUS_P_TEXT;
        cellBg = FSM_COLORS.STATUS_P_BG;
      } else if (estado === 'EXCUSA_MEDICA') {
        cellText = 'E';
        totalLectivos++;
        fgColor = FSM_COLORS.STATUS_E_TEXT;
        cellBg = FSM_COLORS.STATUS_E_BG;
      } else if (estado === 'FESTIVO') {
        cellText = 'F';
        fgColor = FSM_COLORS.STATUS_F_TEXT;
        cellBg = FSM_COLORS.STATUS_F_BG;
      } else if (estado === 'PRACTICAS') {
        cellText = 'PR';
        fgColor = FSM_COLORS.STATUS_PR_TEXT;
        cellBg = FSM_COLORS.STATUS_PR_BG;
      } else if (estado === 'LIBRE') {
        cellText = 'L';
        fgColor = '64748B';
        cellBg = 'F1F5F9';
      }

      cell.value = cellText;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + fgColor } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + cellBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        bottom: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        left: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        right: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } }
      };
    });

    // Total Fallas
    const absCell = row.getCell(totalAbsCol);
    absCell.value = totalAbsents;
    absCell.alignment = { vertical: 'middle', horizontal: 'center' };
    absCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: totalAbsents > 0 ? 'FF991B1B' : 'FF475569' } };
    absCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalAbsents > 0 ? 'FFFEE2E2' : bgArgb } };

    // % Asistencia
    const pct = totalLectivos > 0 ? Math.round(((totalLectivos - totalAbsents) / totalLectivos) * 100) : 100;
    const pctCell = row.getCell(pctCol);
    pctCell.value = `${pct}%`;
    pctCell.alignment = { vertical: 'middle', horizontal: 'center' };
    pctCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: pct >= 80 ? 'FF166534' : 'FF991B1B' } };
    pctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pct >= 80 ? 'FFDCFCE7' : 'FFFEE2E2' } };

    // Borders for metadata cells
    [1, 2, 3, totalAbsCol, pctCol].forEach(c => {
      const cell = row.getCell(c);
      if (c <= 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        bottom: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        left: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        right: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } }
      };
    });

    row.height = 22;
  });

  // Set intelligent column widths
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 16;
  worksheet.getColumn(3).width = 36;
  sessions.forEach((_, idx) => {
    worksheet.getColumn(idx + 4).width = 8.5;
  });
  worksheet.getColumn(totalAbsCol).width = 12;
  worksheet.getColumn(pctCol).width = 12;

  // Legend at bottom
  const legendRowNum = students.length + 8;
  const legendRow = worksheet.getRow(legendRowNum);
  legendRow.getCell(2).value = 'CONVENCIONES:  [ P ]: Presente  |  [ X ]: Falla / Ausente  |  [ E ]: Excusa Médica  |  [ F ]: Festivo Nacional  |  [ PR ]: Prácticas  |  [ L ]: Día Libre';
  legendRow.getCell(2).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF' + FSM_COLORS.TEXT_MUTED } };
  worksheet.mergeCells(legendRowNum, 2, legendRowNum, pctCol);

  const cleanGroupName = groupName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanPeriod = periodoTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  await downloadWorkbook(workbook, `Matriz_Asistencia_${cleanGroupName}_${cleanPeriod}.xlsx`);
}

// =========================================================================
// 2. EXPORT AUDIT LOGS (Registro de Auditoría y Seguridad)
// =========================================================================

export interface AuditLogExportItem {
  created_at: string;
  user_email: string;
  user_name?: string;
  user_role?: string;
  action: string;
  category: string;
  details: string;
  ip_address?: string;
  city?: string;
  country?: string;
  user_agent?: string;
}

export async function exportAuditLogsToExcel(logs: AuditLogExportItem[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fundación San Mateo - Seguridad & Auditoría';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Auditoría_Logs', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 5 }]
  });

  const logoBase64 = await getFSMLogoBase64();
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 52, height: 52 },
    });
  }

  // Row 1: Header Title
  const titleRow = worksheet.getRow(1);
  titleRow.getCell(2).value = 'FUNDACIÓN SAN MATEO — SISTEMA DE AUDITORÍA Y SEGURIDAD';
  titleRow.getCell(2).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(1, 2, 1, 9);
  for (let c = 1; c <= 9; c++) {
    titleRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_HEADER } };
  }
  titleRow.height = 28;

  // Row 2: Subtitle
  const subTitleRow = worksheet.getRow(2);
  subTitleRow.getCell(2).value = `REGISTRO CRONOLÓGICO DE ACTIVIDAD Y TRAZABILIDAD (Total: ${logs.length} eventos)`;
  subTitleRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(2, 2, 2, 9);
  for (let c = 1; c <= 9; c++) {
    subTitleRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_ACCENT } };
  }
  subTitleRow.height = 20;

  // Row 3: Accent Red line
  const accentRow = worksheet.getRow(3);
  for (let c = 1; c <= 9; c++) {
    accentRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.RED_ACCENT } };
  }
  accentRow.height = 4;

  // Row 4: Generation details
  const metaRow = worksheet.getRow(4);
  metaRow.getCell(1).value = `Generado el: ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}  |  Confidencialidad: Nivel Alto (Superadministración)`;
  metaRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + FSM_COLORS.TEXT_MUTED } };
  worksheet.mergeCells(4, 1, 4, 9);
  metaRow.height = 18;

  // Row 5: Column Headers
  const headerRow = worksheet.getRow(5);
  const headers = [
    '#',
    'FECHA Y HORA (BOGOTÁ)',
    'USUARIO / EMAIL',
    'NOMBRE COMPLETO',
    'ROL',
    'ACCIÓN REGISTRADA',
    'CATEGORÍA',
    'DETALLE DEL CAMBIO O ACCIÓN',
    'DIRECCIÓN IP'
  ];

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_HEADER } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 1 || idx === 4 || idx === 6 || idx === 8 ? 'center' : 'left' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF' + FSM_COLORS.NAVY_DARK } },
      bottom: { style: 'medium', color: { argb: 'FF' + FSM_COLORS.NAVY_DARK } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
    };
  });
  headerRow.height = 26;

  // Data rows
  logs.forEach((log, idx) => {
    const rowNum = 6 + idx;
    const row = worksheet.getRow(rowNum);
    const isZebra = idx % 2 === 1;
    const bgArgb = isZebra ? 'FF' + FSM_COLORS.GRAY_LIGHT : 'FFFFFFFF';

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Format timestamp
    let formattedDate = log.created_at;
    try {
      formattedDate = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(new Date(log.created_at));
    } catch {}

    row.getCell(2).value = formattedDate;
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(3).value = log.user_email;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(4).value = log.user_name || 'N/A';
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(5).value = (log.user_role || 'ADMIN').toUpperCase();
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(6).value = log.action;
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + FSM_COLORS.TEXT_DARK } };

    row.getCell(7).value = log.category;
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(8).value = log.details;
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    row.getCell(9).value = log.ip_address || '127.0.0.1';
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };

    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      if (c !== 6) cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF' + FSM_COLORS.TEXT_DARK } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        bottom: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        left: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        right: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } }
      };
    }

    row.height = 24;
  });

  // Column widths
  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 22;
  worksheet.getColumn(3).width = 30;
  worksheet.getColumn(4).width = 24;
  worksheet.getColumn(5).width = 14;
  worksheet.getColumn(6).width = 26;
  worksheet.getColumn(7).width = 16;
  worksheet.getColumn(8).width = 48;
  worksheet.getColumn(9).width = 18;

  const todayStr = new Date().toISOString().split('T')[0];
  await downloadWorkbook(workbook, `Registro_Auditoria_FSM_${todayStr}.xlsx`);
}

// =========================================================================
// 3. EXPORT ATTENDANCE RAW EVENTS / SCAN REPORT (Reporte de Marcaciones)
// =========================================================================

export interface AttendanceEventExportItem {
  id: string;
  student_id: string;
  nombre_estudiante: string;
  documento?: string;
  grado?: string;
  timestamp: string;
  tipo_evento: string;
  sede: string;
  rfid_tag_uid?: string;
  origen?: string;
  observaciones?: string;
}

export async function exportAttendanceEventsToExcel(events: AttendanceEventExportItem[], rangeTitle: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fundación San Mateo - Sistema de Asistencia';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Marcaciones_Asistencia', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 5 }]
  });

  const logoBase64 = await getFSMLogoBase64();
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 52, height: 52 },
    });
  }

  // Row 1: Header Title
  const titleRow = worksheet.getRow(1);
  titleRow.getCell(2).value = 'FUNDACIÓN SAN MATEO EDUCACIÓN SUPERIOR / TÉCNICA';
  titleRow.getCell(2).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(1, 2, 1, 9);
  for (let c = 1; c <= 9; c++) {
    titleRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_HEADER } };
  }
  titleRow.height = 28;

  // Row 2: Subtitle
  const subTitleRow = worksheet.getRow(2);
  subTitleRow.getCell(2).value = `REPORTE INSTITUCIONAL DE ASISTENCIA Y ENTRADAS (${rangeTitle})`;
  subTitleRow.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(2, 2, 2, 9);
  for (let c = 1; c <= 9; c++) {
    subTitleRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_ACCENT } };
  }
  subTitleRow.height = 20;

  // Row 3: Accent Red line
  const accentRow = worksheet.getRow(3);
  for (let c = 1; c <= 9; c++) {
    accentRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.RED_ACCENT } };
  }
  accentRow.height = 4;

  // Row 4: Metadata
  const metaRow = worksheet.getRow(4);
  metaRow.getCell(1).value = `Total Registros: ${events.length}  |  Generado el: ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`;
  metaRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + FSM_COLORS.TEXT_MUTED } };
  worksheet.mergeCells(4, 1, 4, 9);
  metaRow.height = 18;

  // Row 5: Column Headers
  const headerRow = worksheet.getRow(5);
  const headers = [
    '#',
    'FECHA Y HORA',
    'DOCUMENTO',
    'ESTUDIANTE / ALUMNO',
    'GRADO / GRUPO',
    'TIPO EVENTO',
    'SEDE',
    'ORIGEN',
    'OBSERVACIONES'
  ];

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_HEADER } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 1 || idx === 2 || idx === 5 || idx === 6 || idx === 7 ? 'center' : 'left' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF' + FSM_COLORS.NAVY_DARK } },
      bottom: { style: 'medium', color: { argb: 'FF' + FSM_COLORS.NAVY_DARK } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
    };
  });
  headerRow.height = 26;

  // Data rows
  events.forEach((ev, idx) => {
    const rowNum = 6 + idx;
    const row = worksheet.getRow(rowNum);
    const isZebra = idx % 2 === 1;
    const bgArgb = isZebra ? 'FF' + FSM_COLORS.GRAY_LIGHT : 'FFFFFFFF';

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    let formattedDate = ev.timestamp;
    try {
      formattedDate = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(new Date(ev.timestamp));
    } catch {}

    row.getCell(2).value = formattedDate;
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(3).value = ev.documento || 'S/D';
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(4).value = ev.nombre_estudiante;
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + FSM_COLORS.TEXT_DARK } };

    row.getCell(5).value = ev.grado || 'General';
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(6).value = (ev.tipo_evento || 'ENTRADA').toUpperCase();
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(7).value = ev.sede || 'Sede 1';
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(8).value = (ev.origen || 'Torniquete').toUpperCase();
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(9).value = ev.observaciones || '';
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'left' };

    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      if (c !== 4) cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF' + FSM_COLORS.TEXT_DARK } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        bottom: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        left: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        right: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } }
      };
    }

    row.height = 22;
  });

  // Column widths
  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 22;
  worksheet.getColumn(3).width = 16;
  worksheet.getColumn(4).width = 36;
  worksheet.getColumn(5).width = 22;
  worksheet.getColumn(6).width = 16;
  worksheet.getColumn(7).width = 14;
  worksheet.getColumn(8).width = 16;
  worksheet.getColumn(9).width = 30;

  const cleanRange = rangeTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  await downloadWorkbook(workbook, `Reporte_Asistencia_${cleanRange}.xlsx`);
}

// =========================================================================
// 4. EXPORT ISSUED DOCUMENTS & QR REGISTRY (Reporte de Documentos y Títulos)
// =========================================================================

export interface DocumentExportItem {
  consecutivo: string;
  student_nombre: string;
  student_documento?: string;
  tipo_documento: string;
  programa_curso: string;
  fecha_expedicion: string;
  folio?: string;
  libro?: string;
  estado: string;
  notas?: string;
  verification_url?: string;
}

export async function exportDocumentsToExcel(docs: DocumentExportItem[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fundación San Mateo - Registro Documental';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Documentos_Expedidos', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 5 }]
  });

  const logoBase64 = await getFSMLogoBase64();
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 52, height: 52 },
    });
  }

  // Row 1: Header Title
  const titleRow = worksheet.getRow(1);
  titleRow.getCell(2).value = 'FUNDACIÓN SAN MATEO EDUCACIÓN SUPERIOR / TÉCNICA';
  titleRow.getCell(2).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(1, 2, 1, 10);
  for (let c = 1; c <= 10; c++) {
    titleRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_HEADER } };
  }
  titleRow.height = 28;

  // Row 2: Subtitle
  const subTitleRow = worksheet.getRow(2);
  subTitleRow.getCell(2).value = `REGISTRO OFICIAL DE DIPLOMAS, TÍTULOS Y CERTIFICADOS EMITIDOS (Total: ${docs.length} registros)`;
  subTitleRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(2, 2, 2, 10);
  for (let c = 1; c <= 10; c++) {
    subTitleRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_ACCENT } };
  }
  subTitleRow.height = 20;

  // Row 3: Accent Red line
  const accentRow = worksheet.getRow(3);
  for (let c = 1; c <= 10; c++) {
    accentRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.RED_ACCENT } };
  }
  accentRow.height = 4;

  // Row 4: Metadata
  const metaRow = worksheet.getRow(4);
  metaRow.getCell(1).value = `Generado el: ${new Date().toLocaleDateString('es-CO')}  |  Sistema de Verificación Digital y Códigos QR Institucionales`;
  metaRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + FSM_COLORS.TEXT_MUTED } };
  worksheet.mergeCells(4, 1, 4, 10);
  metaRow.height = 18;

  // Row 5: Column Headers
  const headerRow = worksheet.getRow(5);
  const headers = [
    '#',
    'CONSECUTIVO',
    'ESTUDIANTE TITULAR',
    'DOCUMENTO ID',
    'TIPO DE DOCUMENTO',
    'PROGRAMA / CURSO',
    'FECHA EXPEDICIÓN',
    'FOLIO / LIBRO',
    'ESTADO',
    'ENLACE DE VERIFICACIÓN'
  ];

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FSM_COLORS.NAVY_HEADER } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 1 || idx === 3 || idx === 6 || idx === 7 || idx === 8 ? 'center' : 'left' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF' + FSM_COLORS.NAVY_DARK } },
      bottom: { style: 'medium', color: { argb: 'FF' + FSM_COLORS.NAVY_DARK } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
    };
  });
  headerRow.height = 26;

  // Data rows
  docs.forEach((d, idx) => {
    const rowNum = 6 + idx;
    const row = worksheet.getRow(rowNum);
    const isZebra = idx % 2 === 1;
    const bgArgb = isZebra ? 'FF' + FSM_COLORS.GRAY_LIGHT : 'FFFFFFFF';
    const isValido = d.estado.toLowerCase() === 'valido';

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(2).value = d.consecutivo;
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + FSM_COLORS.NAVY_HEADER } };

    row.getCell(3).value = d.student_nombre;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + FSM_COLORS.TEXT_DARK } };

    row.getCell(4).value = d.student_documento || 'S/D';
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(5).value = d.tipo_documento;
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(6).value = d.programa_curso;
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(7).value = d.fecha_expedicion;
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

    const folioLibro = (d.folio ? `Folio: ${d.folio}` : '') + (d.libro ? ` | Libro: ${d.libro}` : '') || 'N/A';
    row.getCell(8).value = folioLibro;
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(9).value = isValido ? 'VÁLIDO' : 'ANULADO';
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(9).font = { name: 'Calibri', size: 10, bold: true, color: { argb: isValido ? 'FF166534' : 'FF991B1B' } };

    const verUrl = d.verification_url || `https://fundacionsanmateosoacha.edu.co/verificar/${d.consecutivo}`;
    row.getCell(10).value = verUrl;
    row.getCell(10).alignment = { vertical: 'middle', horizontal: 'left' };

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      if (c !== 2 && c !== 3 && c !== 9) {
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF' + FSM_COLORS.TEXT_DARK } };
      }
      if (c === 9) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isValido ? 'FFDCFCE7' : 'FFFEE2E2' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        bottom: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        left: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } },
        right: { style: 'thin', color: { argb: 'FF' + FSM_COLORS.GRAY_BORDER } }
      };
    }

    row.height = 22;
  });

  // Column widths
  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 18;
  worksheet.getColumn(3).width = 34;
  worksheet.getColumn(4).width = 16;
  worksheet.getColumn(5).width = 24;
  worksheet.getColumn(6).width = 32;
  worksheet.getColumn(7).width = 18;
  worksheet.getColumn(8).width = 20;
  worksheet.getColumn(9).width = 14;
  worksheet.getColumn(10).width = 44;

  const todayStr = new Date().toISOString().split('T')[0];
  await downloadWorkbook(workbook, `Registro_Documentos_FSM_${todayStr}.xlsx`);
}
