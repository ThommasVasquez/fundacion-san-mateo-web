import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'edge';

export async function GET(
  request: Request,
  context: any
) {
  try {
    let id = '';
    
    // Safely extract from params (supporting both Promise and plain object forms)
    if (context && context.params) {
      const resolvedParams = await context.params;
      id = resolvedParams.id;
    }
    
    // Fallback: Parse ID from the URL pathname if not found in context (e.g. under certain Edge wrappers)
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      const url = new URL(request.url);
      const lastSegment = url.pathname.split('/').pop();
      if (lastSegment && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastSegment)) {
        id = lastSegment;
      }
    }
    
    if (!id) {
      return new Response('ID de documento requerido', { status: 400 });
    }
    
    // Fetch document from database
    const results = await sql`
      SELECT title, file_name, file_base64, external_link 
      FROM normativity_documents 
      WHERE id = ${id}::uuid
      LIMIT 1
    `;
    
    if (results.length === 0) {
      return new Response('Documento no encontrado', { status: 404 });
    }
    
    const doc = results[0];
    
    if (doc.file_base64) {
      let mimeType = 'application/pdf';
      let base64Data = doc.file_base64;
      
      // If it contains a Data URI prefix, parse it
      if (doc.file_base64.startsWith('data:')) {
        const match = doc.file_base64.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }
      
      // Clean up whitespace/newlines from the base64 string
      base64Data = base64Data.replace(/\s/g, '');
      
      // Decode base64 to binary using standard cross-runtime APIs
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return new Response(bytes, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${doc.file_name || 'documento.pdf'}"`,
          'Cache-Control': 'public, max-age=31536000, immutable'
        },
      });
    } else if (doc.external_link) {
      // Redirect to external or static path
      return NextResponse.redirect(new URL(doc.external_link, request.url));
    }
    
    return new Response('El documento no contiene archivo ni enlace externo', { status: 400 });
  } catch (error: any) {
    console.error('Error serving document:', error);
    return new Response(`Error interno del servidor: ${error.message || error}`, { status: 500 });
  }
}
