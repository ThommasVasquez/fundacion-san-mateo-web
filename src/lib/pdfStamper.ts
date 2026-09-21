import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { formatDateDDMMYYYY } from './dateUtils';

export interface StampOptions {
  consecutivo: string;
  studentNombre?: string;
  studentDocumento?: string;
  tipoDocumentoId?: string;    // 'C.C.', 'T.I.', 'C.E.', 'PEP'
  lugarExpedicion?: string;    // e.g. 'Soacha'
  tipoCertificacion?: string;  // e.g. 'Programa Aptitud Ocupacional por' o 'Certificado de Calificaciones'
  programaCurso?: string;      // e.g. 'Competencias Técnico Laboral en Auxiliar en Enfermería'
  ciclo?: string;              // e.g. 'PRIMER CICLO'
  jornada?: string;            // e.g. 'Noche', 'Mañana', 'Tarde', 'Sábado'
  fechaExpedicion?: string;
  tipoDocumento?: string;      // backward compatibility
  logoUrl?: string;            // default to '/FSM.png'
}

/**
 * Loads image bytes from a URL (e.g. '/FSM.png' or remote URL) or base64 string
 */
async function fetchImageBytes(urlOrBase64: string): Promise<Uint8Array> {
  if (urlOrBase64.startsWith('data:image')) {
    const base64Data = urlOrBase64.split(',')[1];
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const response = await fetch(urlOrBase64);
  if (!response.ok) {
    throw new Error(`Failed to load image from ${urlOrBase64}: ${response.statusText}`);
  }
  const arrayBuf = await response.arrayBuffer();
  return new Uint8Array(arrayBuf);
}

/**
 * Stamps an existing PDF with:
 * 1. Semi-transparent institutional watermark (Escudo) in the center of every page.
 * 2. High-resolution institutional logo on the top-left corner.
 * 3. Official Verification Badge with assigned Consecutivo and dynamic QR code on the top-right corner.
 * 4. Institutional security footer with authenticity link.
 */
export async function stampOfficialDocumentPDF(
  pdfBytes: ArrayBuffer | Uint8Array,
  options: StampOptions
): Promise<Uint8Array> {
  const {
    consecutivo,
    fechaExpedicion = new Date().toISOString().split('T')[0],
    logoUrl = '/FSM_stamp.png',
  } = options;

  // 1. Load the original PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // 2. Embed standard fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 3. Embed FSM Logo / Shield
  let logoImage: any = null;
  try {
    const logoBytes = await fetchImageBytes(logoUrl);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (err) {
    console.warn('Could not load logo for stamping, trying fallback or continuing:', err);
  }

  // 4. Generate high-res QR code for verification
  const verificationUrl = `https://fundacionsanmateosoacha.edu.co/verificar/${encodeURIComponent(consecutivo)}`;
  let qrImage: any = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 250,
      color: {
        dark: '#002B49',
        light: '#FFFFFF',
      },
    });
    const qrBytes = await fetchImageBytes(qrDataUrl);
    qrImage = await pdfDoc.embedPng(qrBytes);
  } catch (err) {
    console.warn('Could not generate QR image for PDF stamping:', err);
  }

  const pages = pdfDoc.getPages();
  const formattedDate = formatDateDDMMYYYY(fechaExpedicion);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // ----------------------------------------------------
    // A. MARCA DE AGUA (WATERMARK) - Escudo en el Centro
    // ----------------------------------------------------
    if (logoImage) {
      const wmWidth = Math.min(width * 0.55, 270);
      const wmHeight = (logoImage.height / logoImage.width) * wmWidth;
      const wmX = (width - wmWidth) / 2;
      const wmY = (height - wmHeight) / 2;

      page.drawImage(logoImage, {
        x: wmX,
        y: wmY,
        width: wmWidth,
        height: wmHeight,
        opacity: 0.08, // Sutil institucional
      });
    }

    // ----------------------------------------------------
    // B. LIMPIEZA DE ENCABEZADO Y PIE DE PÁGINA VIEJO
    // Conserva la tabla de calificaciones (y = 555 hacia abajo hasta y = 60)
    // ----------------------------------------------------
    // 1. Limpiar pie de página viejo (y = 0 a 55)
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 55,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    // 2. Limpiar membrete superior viejo en cada hoja
    // Se conserva 100% INTACTO el contenido del PDF de origen (Directora General, estudiante, notas)
    const headerClearHeight = Math.max(77, height - 715);
    const headerClearY = height - headerClearHeight;
    page.drawRectangle({
      x: 0,
      y: headerClearY,
      width: width,
      height: headerClearHeight,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    // ----------------------------------------------------
    // C. ESQUINA SUPERIOR IZQUIERDA - Logo Institucional
    // ----------------------------------------------------
    if (logoImage) {
      const logoW = 46;
      const logoH = (logoImage.height / logoImage.width) * logoW;
      const logoX = 24;
      const logoY = height - logoH - 16;

      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoW,
        height: logoH,
      });
    }

    // ----------------------------------------------------
    // D. ESQUINA SUPERIOR DERECHA - Consecutivo y QR Oficial
    // ----------------------------------------------------
    const badgeWidth = 148;
    const badgeHeight = 44;
    const badgeX = width - badgeWidth - 24;
    const badgeY = height - badgeHeight - 16;

    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeWidth,
      height: badgeHeight,
      color: rgb(0.98, 0.99, 1.0),
      borderColor: rgb(0 / 255, 43 / 255, 73 / 255), // Navy
      borderWidth: 1,
      opacity: 1,
    });

    page.drawRectangle({
      x: badgeX,
      y: badgeY + badgeHeight - 3,
      width: badgeWidth,
      height: 3,
      color: rgb(200 / 255, 16 / 255, 46 / 255), // Red
    });

    page.drawText('VERIFICACIÓN INSTITUCIONAL', {
      x: badgeX + 6,
      y: badgeY + badgeHeight - 13,
      size: 5.8,
      font: helveticaBold,
      color: rgb(200 / 255, 16 / 255, 46 / 255),
    });

    page.drawText(consecutivo, {
      x: badgeX + 6,
      y: badgeY + badgeHeight - 25,
      size: 9,
      font: helveticaBold,
      color: rgb(0 / 255, 43 / 255, 73 / 255),
    });

    page.drawText(`Expedición: ${formattedDate}`, {
      x: badgeX + 6,
      y: badgeY + 7,
      size: 5.8,
      font: helveticaFont,
      color: rgb(80 / 255, 80 / 255, 80 / 255),
    });

    if (qrImage) {
      const qrSize = 34;
      page.drawImage(qrImage, {
        x: badgeX + badgeWidth - qrSize - 5,
        y: badgeY + 5,
        width: qrSize,
        height: qrSize,
      });
    }

    // ----------------------------------------------------
    // E. ENCABEZADO INSTITUCIONAL CENTRADO
    // ----------------------------------------------------
    let curY = height - 22;
    const t1 = 'FUNDACIÓN SAN MATEO';
    const t1W = helveticaBold.widthOfTextAtSize(t1, 11.5);
    page.drawText(t1, {
      x: (width - t1W) / 2,
      y: curY,
      size: 11.5,
      font: helveticaBold,
      color: rgb(118 / 255, 28 / 255, 48 / 255), // Vinotinto FSM
    });
    curY -= 10.5;

    const t2 = 'NIT 832.008.253-1';
    const t2W = helveticaBold.widthOfTextAtSize(t2, 7.5);
    page.drawText(t2, {
      x: (width - t2W) / 2,
      y: curY,
      size: 7.5,
      font: helveticaBold,
      color: rgb(0 / 255, 43 / 255, 73 / 255), // Navy
    });
    curY -= 9.5;

    const t3 = 'Educación para el Trabajo y el Desarrollo Humano';
    const t3W = helveticaBold.widthOfTextAtSize(t3, 7);
    page.drawText(t3, {
      x: (width - t3W) / 2,
      y: curY,
      size: 7,
      font: helveticaBold,
      color: rgb(0 / 255, 43 / 255, 73 / 255),
    });
    curY -= 17;

    // Bloque oficial de resoluciones y certificaciones
    const legalLines = [
      'Aprobación Res. 006253 de SEC del 9 de Diciembre de 2002 Acuerdo 48 del 12 de Febrero de 2002 de Min. Salud',
      'Resolución 513 SES de Junio 5 de 2009 y 2074 del 21 de Septiembre de 2010, Expedida por la Secretaría de Educación,',
      'Acuerdo 00071 del 17 de Mayo de 2019 de Min. Salud y Protección Social, Resolución 1066 del 01 de junio de 2022 de Secretaria de Educación de Soacha,',
      'y Programa de Formación Laboral en Atención Integral de la Primera Infancia Res. 1840 de 31 de Julio de 2018 Expedida por la Secretaría de Educación',
      'SIET No. 513-0. • Certificado de Gestión de Calidad ISO 9001-2011. NTC 5555 NTC 5663 NTC 5581'
    ];

    for (const line of legalLines) {
      const isBold = line.includes('SIET') || line.includes('Certificado');
      const f = isBold ? helveticaBold : helveticaFont;
      const s = 4.4;
      const w = f.widthOfTextAtSize(line, s);
      page.drawText(line, {
        x: (width - w) / 2,
        y: curY,
        size: s,
        font: f,
        color: rgb(90 / 255, 100 / 255, 115 / 255),
      });
      curY -= 5.6;
    }

    // ----------------------------------------------------
    // F. PIE DE PÁGINA OFICIAL INSTITUCIONAL Y NUMERACIÓN
    // ----------------------------------------------------
    const footerLineY = 28;
    page.drawLine({
      start: { x: 30, y: footerLineY },
      end: { x: width - 30, y: footerLineY },
      thickness: 0.5,
      color: rgb(210 / 255, 215 / 255, 225 / 255),
    });

    const footerText1 = 'Principal: Calle 19 #8-21  Teléfonos: 601-9018127 Sede A: Calle 19 N° 7 - 29 Teléfono: 601-8175456';
    const footerText2 = 'Soacha – Cundinamarca | E-mail: direccionacademica@fundacionsanmateosoacha.edu.co';

    const textWidth1 = helveticaFont.widthOfTextAtSize(footerText1, 6);
    page.drawText(footerText1, {
      x: (width - textWidth1) / 2,
      y: footerLineY - 8,
      size: 6,
      font: helveticaFont,
      color: rgb(70 / 255, 70 / 255, 70 / 255),
    });

    const textWidth2 = helveticaFont.widthOfTextAtSize(footerText2, 6);
    page.drawText(footerText2, {
      x: (width - textWidth2) / 2,
      y: footerLineY - 16,
      size: 6,
      font: helveticaFont,
      color: rgb(70 / 255, 70 / 255, 70 / 255),
    });

    // Numeración de página (Abajo a la derecha)
    const pageNumText = `Página ${i + 1} de ${pages.length}`;
    const pageNumWidth = helveticaBold.widthOfTextAtSize(pageNumText, 6.5);
    page.drawText(pageNumText, {
      x: width - 30 - pageNumWidth,
      y: footerLineY - 12,
      size: 6.5,
      font: helveticaBold,
      color: rgb(0 / 255, 43 / 255, 73 / 255), // Navy FSM
    });
  }

  // 5. Return stamped PDF bytes (compressed)
  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Helper to convert Uint8Array / ArrayBuffer to Base64 Data URL
 */
export function uint8ArrayToDataUrl(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
}
