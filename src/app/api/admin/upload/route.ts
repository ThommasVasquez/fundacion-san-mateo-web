import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/** Lee una cookie por nombre sin dependencias adicionales */
function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

/** Verifica que el usuario tenga sesión administrativa activa */
async function esAdmin(req: Request): Promise<boolean> {
  const session = readCookie(req.headers.get('cookie'), 'session');
  if (!session) return false;
  try {
    const parsed = await decrypt(session);
    return Boolean(parsed && parsed.adminId);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    if (!(await esAdmin(req))) {
      return NextResponse.json({ error: 'No autorizado. Se requiere sesión de administrador.' }, { status: 401 });
    }

    let fileBuffer: ArrayBuffer;
    let originalName = 'imagen.jpg';
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    const contentTypeHeader = req.headers.get('content-type') || '';

    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file || file.size === 0) {
        return NextResponse.json({ error: 'No se ha seleccionado ningún archivo o está vacío.' }, { status: 400 });
      }

      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: 'El archivo supera el límite máximo de 25MB.' }, { status: 400 });
      }

      fileBuffer = await file.arrayBuffer();
      originalName = file.name || 'imagen.jpg';
      mimeType = file.type || 'image/jpeg';
      ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    } else {
      // Soporte para carga directa como ArrayBuffer con parámetros query
      const url = new URL(req.url);
      const keyParam = url.searchParams.get('key');
      const extParam = url.searchParams.get('ext') || 'jpg';

      if (!keyParam) {
        return NextResponse.json({ error: 'Falta llave o archivo' }, { status: 400 });
      }

      fileBuffer = await req.arrayBuffer();
      if (!fileBuffer || fileBuffer.byteLength === 0) {
        return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
      }

      originalName = `${keyParam}.${extParam}`;
      ext = extParam.toLowerCase();
      mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
    }

    // Normalizar y limpiar nombre de archivo
    const baseName = originalName
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);

    const timestamp = Date.now();
    const r2Key = `images/${timestamp}_${baseName}.${ext}`;

    // Obtener contexto de Cloudflare para verificar si R2 está disponible
    let env: any;
    try {
      const cfContext = await getCloudflareContext({ async: true });
      env = cfContext?.env;
    } catch (cfError: any) {
      console.warn('No se pudo obtener el contexto de Cloudflare en upload de imagen:', cfError);
    }

    const bucket = env?.IMAGES_BUCKET;

    if (bucket) {
      // Guardar en R2 si el bucket está enlazado
      await bucket.put(r2Key, fileBuffer, {
        httpMetadata: {
          contentType: mimeType,
        },
        customMetadata: {
          originalName,
          uploadedAt: new Date().toISOString(),
        },
      });

      const publicUrl = `/api/documents/file/${r2Key}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        key: r2Key,
        file_name: originalName,
        size: fileBuffer.byteLength,
      });
    }

    // Si R2 no está configurado, guardar de forma segura en Postgres
    const base64Data = Buffer.from(fileBuffer).toString('base64');
    
    // Asegurar que la tabla existe
    await sql`
      CREATE TABLE IF NOT EXISTS uploaded_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name TEXT NOT NULL,
        content_type TEXT NOT NULL,
        data_base64 TEXT NOT NULL,
        file_size INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    const inserted = await sql`
      INSERT INTO uploaded_images (file_name, content_type, data_base64, file_size)
      VALUES (${originalName}, ${mimeType}, ${base64Data}, ${fileBuffer.byteLength})
      RETURNING id
    `;

    const imageId = inserted[0]?.id;
    const publicUrl = `/api/images/${imageId}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      id: imageId,
      file_name: originalName,
      size: fileBuffer.byteLength,
    });

  } catch (error: any) {
    console.error('Error al subir imagen:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}
