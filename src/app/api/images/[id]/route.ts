import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;

    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
      return new Response('ID de imagen inválido', { status: 400 });
    }

    const rows = await sql`
      SELECT content_type, data_base64
      FROM uploaded_images
      WHERE id = ${id}::uuid
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return new Response('Imagen no encontrada', { status: 404 });
    }

    const row = rows[0];
    let base64 = row.data_base64 || '';
    if (base64.includes('base64,')) {
      base64 = base64.split('base64,')[1];
    }

    const buffer = Buffer.from(base64, 'base64');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': row.content_type || 'image/webp',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error al servir imagen:', error);
    return new Response('Error interno al servir la imagen', { status: 500 });
  }
}
