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
    let object = null;

    if (bucket) {
      try {
        object = await bucket.get(key);
      } catch (err) {
        console.warn('Error al consultar R2 en file viewer:', err);
      }
    }

    if (object) {
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
        } else if (key.endsWith('.webp')) {
          contentType = 'image/webp';
        } else if (key.endsWith('.svg')) {
          contentType = 'image/svg+xml';
        } else if (key.endsWith('.gif')) {
          contentType = 'image/gif';
        } else if (key.endsWith('.avif')) {
          contentType = 'image/avif';
        } else {
          contentType = 'application/octet-stream';
        }
        headers.set('Content-Type', contentType);
      }

      headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');

      return new Response(object.body, {
        status: 200,
        headers,
      });
    }

    // 2. Respaldo de alta resiliencia: Si no está en R2 o R2 no está activo, buscar en Postgres (uploaded_documents)
    try {
      const { sql } = await import('@/lib/db');
      const rows = await sql`
        SELECT file_name, content_type, data_base64, file_size
        FROM uploaded_documents
        WHERE file_key = ${key} 
           OR file_key = ${'normativity/' + key} 
           OR file_key = ${'documents/' + key}
        LIMIT 1
      `;

      if (rows && rows.length > 0) {
        const row = rows[0];
        let base64 = row.data_base64 || '';
        if (base64.includes('base64,')) {
          base64 = base64.split('base64,')[1];
        }

        const buffer = Buffer.from(base64, 'base64');
        const headers = new Headers();
        headers.set('Content-Type', row.content_type || 'application/pdf');
        headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name || 'documento.pdf')}"`);
        headers.set('Content-Length', String(buffer.length));
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(buffer, {
          status: 200,
          headers,
        });
      }
    } catch (dbErr) {
      console.warn('Error al buscar documento en uploaded_documents:', dbErr);
    }

    // Fallback permanente: Si no se encuentra y es imagen, redirigir al asset institucional correspondiente
    if (key.startsWith('images/')) {
      const lowerKey = key.toLowerCase();
      // Hero principal del Home: FSM Inicio
      if (lowerKey.includes('fsm_img_inicio') || lowerKey.includes('fsm_inicio') || lowerKey.includes('img_2_fsm_inicio')) {
        return Response.redirect(new URL('/img/servicio-al-cliente.jpg', request.url), 302);
      }
      // Enfermería
      if (lowerKey.includes('enfermer') || lowerKey.includes('3767')) {
        return Response.redirect(new URL('/img/image18.jpg', request.url), 302);
      }
      // Primera Infancia y Preescolar
      if (lowerKey.includes('copia_2') || lowerKey.includes('preescolar')) {
        return Response.redirect(new URL('/img/image25.jpg', request.url), 302);
      }
      if (lowerKey.includes('infancia')) {
        return Response.redirect(new URL('/img/image27.jpg', request.url), 302);
      }
      // Información, Sistemas y Servicio al Cliente
      if (lowerKey.includes('copia') || lowerKey.includes('sistemas') || lowerKey.includes('cliente')) {
        return Response.redirect(new URL('/img/image8.jpg', request.url), 302);
      }
      // Inglés
      if (lowerKey.includes('ingles') || lowerKey.includes('inglés')) {
        return Response.redirect(new URL('/img/image10.jpg', request.url), 302);
      }
      // Ceremonias y Grados
      if (lowerKey.includes('ceremonia')) {
        return Response.redirect(new URL('/img/image2.png', request.url), 302);
      }
      // Prácticas Hospitalarias
      if (lowerKey.includes('practica')) {
        return Response.redirect(new URL('/img/pract2.jpg', request.url), 302);
      }
      // Calendario Académico
      if (lowerKey.includes('calendario')) {
        return Response.redirect(new URL('/img/banner7.jpg', request.url), 302);
      }
      // Punto de Contacto y Contacto
      if (lowerKey.includes('punto_de_contacto') || lowerKey.includes('contacto')) {
        return Response.redirect(new URL('/img/banner9.jpg', request.url), 302);
      }
      return Response.redirect(new URL('/img/banner6.jpg', request.url), 302);
    }

    return new Response('Documento no encontrado en el almacenamiento institucional', { status: 404 });
  } catch (error: any) {
    console.error('Error al servir documento institucional:', error);
    return new Response(`Error interno: ${error.message || error}`, { status: 500 });
  }
}
