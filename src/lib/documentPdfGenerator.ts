import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { formatDateDDMMYYYY } from './dateUtils';

export interface DocumentPdfData {
  consecutivo: string;
  student_nombre: string;
  student_documento?: string;
  tipo_documento: string;
  programa_curso: string;
  fecha_expedicion: string;
  folio?: string;
  libro?: string;
  estado?: string;
  notas?: string;
}

// Helper to load an image URL to a base64 DataURL
async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Canvas context unavailable'));
      }
    };
    img.onerror = (e) => reject(e);
    img.src = imageUrl;
  });
}

export async function generateDocumentPDF(docData: DocumentPdfData) {
  const isLandscape = docData.tipo_documento.toLowerCase().includes('diploma');
  const orientation = isLandscape ? 'landscape' : 'portrait';
  
  // Create jsPDF instance
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Verification URL for QR code
  const verificationUrl = `https://fundacionsanmateosoacha.edu.co/verificar/${encodeURIComponent(docData.consecutivo)}`;
  
  // Generate high-res QR code Base64
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 1,
      color: {
        dark: '#002B49',
        light: '#FFFFFF',
      },
    });
  } catch (e) {
    console.error('Error generating QR code for PDF:', e);
  }

  // Load Logo
  let logoDataUrl = '';
  try {
    logoDataUrl = await getBase64ImageFromUrl('/FSM.png');
  } catch (e) {
    console.warn('Could not load /FSM.png, continuing without logo image:', e);
  }

  // Brand Colors
  const blueNavy = [0, 43, 73];    // #002B49
  const redFsm = [200, 16, 46];    // #C8102E
  const goldFsm = [217, 119, 6];   // #D97706
  const grayDark = [50, 50, 50];
  const grayLight = [240, 243, 246];

  // 1. Background Ornamental Security Borders
  // Outer Border
  pdf.setDrawColor(blueNavy[0], blueNavy[1], blueNavy[2]);
  pdf.setLineWidth(1.5);
  pdf.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Inner Border (Gold)
  pdf.setDrawColor(goldFsm[0], goldFsm[1], goldFsm[2]);
  pdf.setLineWidth(0.6);
  pdf.rect(10.5, 10.5, pageWidth - 21, pageHeight - 21);

  // Corner Accents
  pdf.setFillColor(blueNavy[0], blueNavy[1], blueNavy[2]);
  const cornerSize = 4;
  pdf.rect(8, 8, cornerSize, cornerSize, 'F');
  pdf.rect(pageWidth - 8 - cornerSize, 8, cornerSize, cornerSize, 'F');
  pdf.rect(8, pageHeight - 8 - cornerSize, cornerSize, cornerSize, 'F');
  pdf.rect(pageWidth - 8 - cornerSize, pageHeight - 8 - cornerSize, cornerSize, cornerSize, 'F');

  if (isLandscape) {
    // ==========================================
    // DIPLOMA LAYOUT (HORIZONTAL / LANDSCAPE)
    // ==========================================
    let currentY = 22;

    // Logo (Centered Top)
    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, 'PNG', (pageWidth / 2) - 13, currentY - 6, 26, 26);
      currentY += 24;
    } else {
      currentY += 10;
    }

    // Institution Name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text('FUNDACIÓN EDUCATIVA SAN MATEO', pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(redFsm[0], redFsm[1], redFsm[2]);
    pdf.text('RESOLUCIÓN Y REGISTRO OFICIAL DE SECRETARÍA DE EDUCACIÓN DE SOACHA', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('INSTITUCIÓN DE FORMACIÓN PARA EL TRABAJO Y EL DESARROLLO HUMANO', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Diploma Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(goldFsm[0], goldFsm[1], goldFsm[2]);
    pdf.text(docData.tipo_documento.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('Otorga el presente título a:', pageWidth / 2, currentY, { align: 'center' });
    currentY += 9;

    // Student Name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text(docData.student_nombre.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    // Student ID
    if (docData.student_documento) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
      pdf.text(`Identificación: ${docData.student_documento}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
    } else {
      currentY += 4;
    }

    // Program
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('Por haber cursado y aprobado satisfactoriamente el programa académico de:', pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(redFsm[0], redFsm[1], redFsm[2]);
    pdf.text(docData.programa_curso.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Expedition text
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    const expDateStr = formatDateDDMMYYYY(docData.fecha_expedicion);
    pdf.text(`Expedido en Soacha, Cundinamarca, a los ${expDateStr}`, pageWidth / 2, currentY, { align: 'center' });

    // Signatures and QR Code at bottom
    const bottomY = pageHeight - 38;

    // Left Signature
    pdf.setDrawColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.setLineWidth(0.4);
    pdf.line(28, bottomY + 12, 85, bottomY + 12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text('RECTORÍA GENERAL', 56.5, bottomY + 16, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('Fundación San Mateo', 56.5, bottomY + 20, { align: 'center' });

    // Center Signature
    pdf.line(115, bottomY + 12, 172, bottomY + 12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text('SECRETARÍA ACADÉMICA', 143.5, bottomY + 16, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('Registro y Control', 143.5, bottomY + 20, { align: 'center' });

    // QR Code Box (Right Side)
    if (qrDataUrl) {
      pdf.addImage(qrDataUrl, 'PNG', pageWidth - 54, bottomY - 5, 26, 26);
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text(docData.consecutivo, pageWidth - 41, bottomY + 24, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('Verificación QR Oficial', pageWidth - 41, bottomY + 27.5, { align: 'center' });

    // Legal / Registry metadata
    if (docData.folio || docData.libro) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
      const regText = `Libro: ${docData.libro || 'N/A'}  |  Folio: ${docData.folio || 'N/A'}`;
      pdf.text(regText, 28, pageHeight - 13);
    }

  } else {
    // ==========================================
    // CERTIFICADO / CONSTANCIA / ACTA LAYOUT (PORTRAIT / VERTICAL)
    // ==========================================
    let currentY = 22;

    // Header Logo & Institution Name
    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, 'PNG', 18, currentY - 4, 22, 22);
    }

    // Institution Name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text('FUNDACIÓN EDUCATIVA SAN MATEO', 44, currentY + 2);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(redFsm[0], redFsm[1], redFsm[2]);
    pdf.text('INSTITUCIÓN DE EDUCACIÓN PARA EL TRABAJO Y EL DESARROLLO HUMANO', 44, currentY + 7);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('Reconocimiento Oficial de Secretaría de Educación de Soacha', 44, currentY + 11.5);
    pdf.text('NIT: 900.XXX.XXX-X  •  Soacha, Cundinamarca', 44, currentY + 15.5);

    currentY += 28;

    // Divider Line
    pdf.setDrawColor(goldFsm[0], goldFsm[1], goldFsm[2]);
    pdf.setLineWidth(0.6);
    pdf.line(18, currentY, pageWidth - 18, currentY);
    currentY += 10;

    // Consecutivo Badge
    pdf.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
    pdf.roundedRect(pageWidth - 68, currentY - 4, 50, 9, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text(`CONSECUTIVO: ${docData.consecutivo}`, pageWidth - 43, currentY + 2, { align: 'center' });

    // Document Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text(docData.tipo_documento.toUpperCase(), 18, currentY + 2);
    currentY += 14;

    // Official Certifier text
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text('LA DIRECCIÓN ACADÉMICA Y DE REGISTRO DE LA FUNDACIÓN SAN MATEO', 18, currentY);
    currentY += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(redFsm[0], redFsm[1], redFsm[2]);
    pdf.text('CERTIFICA:', 18, currentY);
    currentY += 9;

    // Body text
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('Que el(la) estudiante:', 18, currentY);
    currentY += 7;

    // Student Full Name Box
    pdf.setFillColor(245, 248, 252);
    pdf.roundedRect(18, currentY - 2, pageWidth - 36, 16, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text(docData.student_nombre.toUpperCase(), 22, currentY + 5);

    if (docData.student_documento) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
      pdf.text(`Identificado(a) con Documento de Identidad Nº: ${docData.student_documento}`, 22, currentY + 11);
    }
    currentY += 24;

    // Academic Certification details
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);

    const isGradeOrExam = docData.tipo_documento.toLowerCase().includes('nota') || docData.tipo_documento.toLowerCase().includes('calific');
    const isPractice = docData.tipo_documento.toLowerCase().includes('práct') || docData.tipo_documento.toLowerCase().includes('pract');
    const isCost = docData.tipo_documento.toLowerCase().includes('cost');

    let mainStatement = `Cursó y completó a cabalidad todas las exigencias curriculares del programa académico de:`;
    if (isGradeOrExam) {
      mainStatement = `Ha cursado y aprobado satisfactoriamente los módulos académicos y calificaciones del programa:`;
    } else if (isPractice) {
      mainStatement = `Completó y aprobó a satisfacción la totalidad de horas y competencias de prácticas formativas del programa:`;
    } else if (isCost) {
      mainStatement = `Se encuentra debidamente registrado(a) y se certifican los costos académicos, aranceles y derechos pecuniarios del programa:`;
    }

    const splitStatement = pdf.splitTextToSize(mainStatement, pageWidth - 36);
    pdf.text(splitStatement, 18, currentY);
    currentY += (splitStatement.length * 5) + 3;

    // Program name highlight
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(redFsm[0], redFsm[1], redFsm[2]);
    const splitProgram = pdf.splitTextToSize(docData.programa_curso.toUpperCase(), pageWidth - 36);
    pdf.text(splitProgram, 18, currentY);
    currentY += (splitProgram.length * 6) + 4;

    // Registry details (Folio, Libro, Notas)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);

    if (docData.folio || docData.libro) {
      pdf.text(`Registro institucional asentado en Libro: ${docData.libro || 'N/A'}, Folio: ${docData.folio || 'N/A'}.`, 18, currentY);
      currentY += 6;
    }

    if (docData.notas) {
      const splitNotas = pdf.splitTextToSize(`Observaciones: ${docData.notas}`, pageWidth - 36);
      pdf.text(splitNotas, 18, currentY);
      currentY += (splitNotas.length * 5) + 2;
    }

    // Expedition text
    currentY += 4;
    const expDateStr = formatDateDDMMYYYY(docData.fecha_expedicion);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.text(`Para constancia de lo anterior, se expide el presente documento en Soacha, Cundinamarca, el ${expDateStr}.`, 18, currentY);
    currentY += 14;

    // Verification Box with QR
    const qrBoxY = pageHeight - 74;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(220, 226, 235);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(18, qrBoxY, pageWidth - 36, 28, 3, 3, 'FD');

    if (qrDataUrl) {
      pdf.addImage(qrDataUrl, 'PNG', 22, qrBoxY + 3, 22, 22);
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text('VERIFICACIÓN DIGITAL Y AUTENTICIDAD INSTITUCIONAL', 48, qrBoxY + 8);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    const infoText = 'Este documento cuenta con validez legal garantizada mediante código consecutivo institucional y código QR. Puede verificar su autenticidad escaneando el código con cualquier cámara móvil o ingresando a https://fundacionsanmateosoacha.edu.co/verificar';
    const splitInfo = pdf.splitTextToSize(infoText, pageWidth - 88);
    pdf.text(splitInfo, 48, qrBoxY + 13);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(redFsm[0], redFsm[1], redFsm[2]);
    pdf.text(`Consecutivo Oficial: ${docData.consecutivo}`, 48, qrBoxY + 24);

    // Signatures
    const sigY = pageHeight - 32;

    // Rector Signature Line
    pdf.setDrawColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.setLineWidth(0.4);
    pdf.line(25, sigY + 10, 85, sigY + 10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text('RECTORÍA GENERAL', 55, sigY + 14, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('Fundación San Mateo', 55, sigY + 18, { align: 'center' });

    // Academic Secretary Signature Line
    pdf.line(pageWidth - 85, sigY + 10, pageWidth - 25, sigY + 10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    pdf.text('SECRETARÍA ACADÉMICA', pageWidth - 55, sigY + 14, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    pdf.text('Registro y Control', pageWidth - 55, sigY + 18, { align: 'center' });
  }

  // Save the PDF
  const safeName = docData.student_nombre ? `_${docData.student_nombre.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  const filename = `FSM-000-${docData.consecutivo}${safeName}.pdf`;
  pdf.save(filename);
}
