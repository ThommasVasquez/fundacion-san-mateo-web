import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ table: string; id: string }> | { table: string; id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const table = (resolvedParams.table || '').toLowerCase();
    const id = resolvedParams.id || '';

    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return new Response('ID inválido', { status: 400 });
    }

    const url = new URL(request.url);
    const isThumb = url.searchParams.get('thumb') === '1';

    let rows: any[] = [];

    if (table === 'gallery') {
      rows = isThumb
        ? await sql`SELECT COALESCE(NULLIF(thumb_url, ''), image_url) as raw_data FROM gallery_items WHERE id::text = ${id} LIMIT 1`
        : await sql`SELECT image_url as raw_data FROM gallery_items WHERE id::text = ${id} LIMIT 1`;
    } else if (table === 'news') {
      rows = await sql`SELECT image_url as raw_data FROM news_events WHERE id::text = ${id} LIMIT 1`;
    } else if (table === 'blog') {
      rows = await sql`SELECT image_base64 as raw_data FROM blog_posts WHERE id::text = ${id} LIMIT 1`;
    } else if (table === 'programs') {
      rows = await sql`SELECT image_url as raw_data FROM academic_programs WHERE id::text = ${id} LIMIT 1`;
    } else {
      return new Response('Tabla no soportada', { status: 400 });
    }

    if (!rows || rows.length === 0 || !rows[0].raw_data) {
      return new Response('Imagen no encontrada', { status: 404 });
    }

    const rawData: string = rows[0].raw_data;

    if (rawData.startsWith('/') || rawData.startsWith('http://') || rawData.startsWith('https://')) {
      return Response.redirect(new URL(rawData, request.url), 302);
    }

    let mimeType = 'image/jpeg';
    let base64 = rawData;

    if (rawData.startsWith('data:')) {
      const match = rawData.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1] || 'image/jpeg';
        base64 = match[2];
      } else if (rawData.includes('base64,')) {
        base64 = rawData.split('base64,')[1];
      }
    }

    const buffer = Buffer.from(base64, 'base64');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error al servir imagen legacy:', error);
    return new Response('Error interno al servir la imagen', { status: 500 });
  }
}
