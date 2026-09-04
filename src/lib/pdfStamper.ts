import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { formatDateDDMMYYYY } from './dateUtils';

export interface StampOptions {
  consecutivo: string;
  studentNombre?: string;
  studentDocumento?: string;
  fechaExpedicion?: string;
  tipoDocumento?: string;
  programaCurso?: string;
  logoUrl?: string; // default to '/FSM.png'
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
    logoUrl = '/FSM.png',
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
      const wmMaxWidth = Math.min(width * 0.60, 320);
      const wmWidth = wmMaxWidth;
      const wmHeight = (logoImage.height / logoImage.width) * wmWidth;
      const wmX = (width - wmWidth) / 2;
      const wmY = (height - wmHeight) / 2;

      page.drawImage(logoImage, {
        x: wmX,
        y: wmY,
        width: wmWidth,
        height: wmHeight,
        opacity: 0.10, // Subtle institutional watermark
      });
    }

    // ----------------------------------------------------
    // CLEANUP / COVER UNWANTED BROWSER PRINT HEADERS & FOOTERS
    // ----------------------------------------------------
    // 1. Cover bottom browser print footer (e.g. Q10 URL and "Página 1 de 2")
    // The browser print footer is located between y=12 and y=44 pt.
    // Drawing an opaque white rectangle across the bottom 48 pt cleanly wipes it out.
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 48,
      color: rgb(1, 1, 1), // Pure opaque white
      opacity: 1,
    });

    // 2. Cover top browser print header (e.g. "null 4/09/26, 10:37 a.m.")
    page.drawRectangle({
      x: 0,
      y: height - 22,
      width: width,
      height: 22,
      color: rgb(1, 1, 1), // Pure opaque white
      opacity: 1,
    });

    // ----------------------------------------------------
    // A. MARCA DE AGUA (WATERMARK) - Escudo en el Centro
    // ----------------------------------------------------
    if (logoImage) {
      const wmMaxWidth = Math.min(width * 0.60, 320);
      const wmWidth = wmMaxWidth;
      const wmHeight = (logoImage.height / logoImage.width) * wmWidth;
      const wmX = (width - wmWidth) / 2;
      const wmY = (height - wmHeight) / 2;

      page.drawImage(logoImage, {
        x: wmX,
        y: wmY,
        width: wmWidth,
        height: wmHeight,
        opacity: 0.10, // Subtle institutional watermark
      });
    }

    // ----------------------------------------------------
    // B. ESQUINA SUPERIOR IZQUIERDA - Logo Institucional (30% MÁS GRANDE)
    // ----------------------------------------------------
    if (logoImage) {
      // 44 * 1.30 = 57.2 -> 58pt (30% más grande)
      const logoWidth = 58;
      const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
      const logoX = 20;
      const logoY = height - logoHeight - 16;

      // Clean white background card behind top-left logo to prevent background bleed
      const leftHeaderBoxWidth = logoWidth + 175;
      const leftHeaderBoxHeight = logoHeight + 8;
      page.drawRectangle({
        x: logoX - 4,
        y: logoY - 4,
        width: leftHeaderBoxWidth,
        height: leftHeaderBoxHeight,
        color: rgb(1, 1, 1),
        opacity: 0.98,
      });

      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoWidth,
        height: logoHeight,
        opacity: 1,
      });

      // Text next to enlarged logo
      page.drawText('FUNDACIÓN SAN MATEO', {
        x: logoX + logoWidth + 8,
        y: logoY + logoHeight - 15,
        size: 9,
        font: helveticaBold,
        color: rgb(0 / 255, 43 / 255, 73 / 255), // #002B49 Navy
      });

      page.drawText('Educación para el Trabajo y Desarrollo Humano', {
        x: logoX + logoWidth + 8,
        y: logoY + logoHeight - 27,
        size: 6.5,
        font: helveticaFont,
        color: rgb(90 / 255, 100 / 255, 115 / 255),
      });

      page.drawText('Resolución Oficial Secretaría de Educación de Soacha', {
        x: logoX + logoWidth + 8,
        y: logoY + logoHeight - 37,
        size: 5.5,
        font: helveticaFont,
        color: rgb(140 / 255, 150 / 255, 165 / 255),
      });
    }

    // ----------------------------------------------------
    // C. ESQUINA SUPERIOR DERECHA - Consecutivo y QR Oficial
    // ----------------------------------------------------
    const badgeWidth = 155;
    const badgeHeight = 44;
    const badgeX = width - badgeWidth - 20;
    const badgeY = height - badgeHeight - 16;

    // Badge container background (solid white with slight tint)
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

    // Red top indicator bar on badge
    page.drawRectangle({
      x: badgeX,
      y: badgeY + badgeHeight - 4,
      width: badgeWidth,
      height: 4,
      color: rgb(200 / 255, 16 / 255, 46 / 255), // FSM Red
    });

    // Badge header
    page.drawText('VERIFICACIÓN INSTITUCIONAL', {
      x: badgeX + 7,
      y: badgeY + badgeHeight - 13,
      size: 6,
      font: helveticaBold,
      color: rgb(200 / 255, 16 / 255, 46 / 255),
    });

    // Consecutivo Code (Prominent)
    page.drawText(consecutivo, {
      x: badgeX + 7,
      y: badgeY + badgeHeight - 26,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0 / 255, 43 / 255, 73 / 255),
    });

    // Date & page
    page.drawText(`Expedición: ${formattedDate}`, {
      x: badgeX + 7,
      y: badgeY + 7,
      size: 6,
      font: helveticaFont,
      color: rgb(80 / 255, 80 / 255, 80 / 255),
    });

    // Mini QR inside top-right badge
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
    // D. PIE DE PÁGINA (SECURITY FOOTER BAR)
    // ----------------------------------------------------
    const footerY = 16;
    page.drawLine({
      start: { x: 20, y: footerY + 12 },
      end: { x: width - 20, y: footerY + 12 },
      thickness: 0.8,
      color: rgb(200 / 255, 16 / 255, 46 / 255), // FSM Red Line
    });

    page.drawText(
      `Fundación San Mateo • Documento Oficial No. ${consecutivo} • Verifique autenticidad en: ${verificationUrl}`,
      {
        x: 20,
        y: footerY,
        size: 6.2,
        font: helveticaFont,
        color: rgb(75 / 255, 85 / 255, 100 / 255),
      }
    );
  }

  // 5. Return stamped PDF bytes
  return await pdfDoc.save();
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
