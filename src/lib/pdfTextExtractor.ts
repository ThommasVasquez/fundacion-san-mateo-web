/**
 * Client-side helper to extract text and detect student metadata from educational PDFs (e.g. Q10 reports, constancias)
 */
export async function extractStudentInfoFromPDF(pdfArrayBuffer: ArrayBuffer): Promise<{
  extractedText: string;
  studentNombre?: string;
  studentDocumento?: string;
  tipoDocumentoId?: string;
  lugarExpedicion?: string;
  programaCurso?: string;
  ciclo?: string;
  jornada?: string;
  tipoDocumento?: string;
}> {
  try {
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker src if needed or disable worker
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfArrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= Math.min(pdfDoc.numPages, 3); i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }

    // Heuristic Parsing for Q10 / FSM standard documents
    let studentNombre: string | undefined;
    let studentDocumento: string | undefined;
    let tipoDocumentoId: string | undefined;
    let lugarExpedicion: string | undefined;
    let programaCurso: string | undefined;
    let ciclo: string | undefined;
    let jornada: string | undefined;
    let tipoDocumento: string | undefined;

    // 1. Detect Student Name
    // Example pattern: "El (La) estudiante BRAYAN ALEJANDRO GOMEZ MEDINA, identificado"
    const nameMatch = fullText.match(/(?:estudiante|alumno\(a\)|estudiante\s*:)\s+([A-ZÁÉÍÓÚÑ\s]{6,50})(?:,|\s+identificado|\s+con\s+documento|\s+CC|\s+TI)/i);
    if (nameMatch && nameMatch[1]) {
      studentNombre = nameMatch[1].trim().replace(/\s+/g, ' ');
    }

    // 2. Detect Student Document Number & Type
    const idTypeMatch = fullText.match(/(?:documento\s+de\s+identidad\s+n[uú]mero|identificad[oa]\s+con\s+documento\s+de\s+identidad\s+n[uú]mero)\s*(C\.?C\.?|T\.?I\.?|C\.?E\.?|PEP)/i);
    if (idTypeMatch && idTypeMatch[1]) {
      tipoDocumentoId = idTypeMatch[1].replace(/\./g, '').toUpperCase();
      if (tipoDocumentoId === 'CC') tipoDocumentoId = 'C.C.';
      if (tipoDocumentoId === 'TI') tipoDocumentoId = 'T.I.';
      if (tipoDocumentoId === 'CE') tipoDocumentoId = 'C.E.';
    }

    const docMatch = fullText.match(/(?:documento\s+de\s+identidad\s+n[uú]mero|C\.?C\.?|T\.?I\.?|C[eé]dula|identificad[oa]\s+con\s+(?:C\.?C\.?)?)\s*[:.]?\s*([0-9]{6,12})/i);
    if (docMatch && docMatch[1]) {
      studentDocumento = docMatch[1].trim();
    }

    // Detect Place of issue (expedida en Soacha, etc.)
    const cityMatch = fullText.match(/expedida\s+en\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:,|\s+curs[oó])/i);
    if (cityMatch && cityMatch[1]) {
      lugarExpedicion = cityMatch[1].trim();
    }

    // Detect Cycle (e.g. PRIMER CICLO)
    const cicloMatch = fullText.match(/curs[oó]\s+y\s+aprob[oó]\s+el\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)\s+correspondiente/i);
    if (cicloMatch && cicloMatch[1]) {
      ciclo = cicloMatch[1].trim();
    }

    // 3. Detect Program
    // Example: "al Programa Aptitud Ocupacional por Competencias Tecnico Laboral en Auxiliar en Enfermería"
    const progMatch = fullText.match(/(?:Programa(?:\s+Aptitud\s+Ocupacional\s+por\s+Competencias)?\s+)?(T[eé]cnico\s+Laboral\s+en\s+[\w\sÁÉÍÓÚÑ]+|Auxiliar\s+en\s+[\w\sÁÉÍÓÚÑ]+|Primera\s+Infancia|Sistemas|Administraci[oó]n|Contabilidad)/i);
    if (progMatch && progMatch[1]) {
      let prog = progMatch[1].split(/,|\.|\s{2,}|en la Jornada/i)[0].trim();
      programaCurso = prog;
    }

    // Detect Journey (Jornada Noche, Jornada Mañana, Jornada Tarde, Jornada Sábado)
    const jornadaMatch = fullText.match(/en\s+la\s+Jornada\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+)/i);
    if (jornadaMatch && jornadaMatch[1]) {
      jornada = jornadaMatch[1].trim();
    }

    // 4. Detect Document Type
    if (/calificaciones|notas|asignatura|ih semanal/i.test(fullText)) {
      tipoDocumento = 'Certificado de Notas';
    } else if (/pr[aá]ctica/i.test(fullText)) {
      tipoDocumento = 'Certificado de Prácticas';
    } else if (/costo|arancel|tarifa|valor|pago|derecho pecuniario|matr[ií]cula/i.test(fullText)) {
      tipoDocumento = 'Certificado de Costos';
    } else if (/hace constar que|constancia/i.test(fullText)) {
      tipoDocumento = 'Constancia de Estudio';
    } else if (/diploma|título/i.test(fullText)) {
      tipoDocumento = 'Diploma de Grado';
    } else if (/acta de grado/i.test(fullText)) {
      tipoDocumento = 'Acta de Grado';
    }

    return {
      extractedText: fullText,
      studentNombre,
      studentDocumento,
      tipoDocumentoId,
      lugarExpedicion,
      programaCurso,
      ciclo,
      jornada,
      tipoDocumento,
    };
  } catch (error) {
    console.warn('PDF text extraction fallback (could not extract text automatically):', error);
    return { extractedText: '' };
  }
}
