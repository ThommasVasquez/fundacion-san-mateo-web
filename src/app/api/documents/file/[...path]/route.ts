import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolvedParams = await context.params;
    const pathSegments = resolvedParams.path;

    if (!pathSegments || pathSegments.length === 0) {
      return new Response('Ruta de archivo no especificada', { status: 400 });
    }

    const key = Array.isArray(pathSegments) ? pathSegments.join('/') : String(pathSegments);

    // Seguridad básica contra path traversal
    if (key.includes('..') || key.startsWith('/')) {
      return new Response('Ruta inválida', { status: 400 });
    }

    let env: any;
    try {
      const cfContext = await getCloudflareContext({ async: true });
      env = cfContext?.env;
    } catch (cfError) {
      console.warn('Error al obtener contexto de Cloudflare en file viewer:', cfError);
    }

    const bucket = env?.IMAGES_BUCKET;
    if (!bucket) {
      return new Response('Almacenamiento no disponible', { status: 503 });
    }

    const object = await bucket.get(key);

    if (!object) {
      return new Response('Documento no encontrado en el almacenamiento', { status: 404 });
    }

    const headers = new Headers();
    if (typeof object.writeHttpMetadata === 'function') {
      object.writeHttpMetadata(headers);
    }

    if (object.httpEtag) {
      headers.set('etag', object.httpEtag);
    }

    // Nombre de archivo para la cabecera Content-Disposition
    const originalName = object.customMetadata?.originalName || key.split('/').pop() || 'documento.pdf';

    // Determinar mimeType
    let contentType = headers.get('Content-Type');
    if (!contentType || contentType === 'application/octet-stream') {
      if (key.endsWith('.pdf')) {
        contentType = 'application/pdf';
      } else if (key.endsWith('.png')) {
        contentType = 'image/png';
      } else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else {
        contentType = 'application/pdf';
      }
      headers.set('Content-Type', contentType);
    }

    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Error al servir documento desde R2:', error);
    return new Response(`Error interno: ${error.message || error}`, { status: 500 });
  }
}
