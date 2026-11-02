import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams?.id;

    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
      return new Response('ID de documento inválido', { status: 400 });
    }

    const rows = await sql`
      SELECT consecutivo, student_nombre, tipo_documento, pdf_url
      FROM issued_documents
      WHERE id = ${id}::uuid
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return new Response('Documento no encontrado', { status: 404 });
    }

    const doc = rows[0];
    if (!doc.pdf_url) {
      return new Response('El documento no tiene archivo PDF adjunto', { status: 404 });
    }

    // Si ya es una URL externa o ruta en /api/documents/file/..., redirigir
    if (doc.pdf_url.startsWith('/') || doc.pdf_url.startsWith('http')) {
      return Response.redirect(new URL(doc.pdf_url, request.url), 302);
    }

    // Si es un base64 legado (data:application/pdf;base64,...)
    let base64 = doc.pdf_url;
    let mimeType = 'application/pdf';
    if (base64.startsWith('data:')) {
      const match = base64.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64 = match[2];
      }
    }

    const buffer = Buffer.from(base64.replace(/\s/g, ''), 'base64');
    const safeName = `FSM-000-${doc.consecutivo}_${(doc.student_nombre || '').replace(/\s+/g, '_')}.pdf`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(safeName)}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error al servir PDF de issued_documents:', error);
    return new Response(`Error interno: ${error.message || error}`, { status: 500 });
  }
}
