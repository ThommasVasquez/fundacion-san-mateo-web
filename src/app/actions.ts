'use server';

import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { encrypt } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' };
  }

  try {
    const users = await sql`SELECT id, email, password_hash, role FROM admin_users WHERE email = ${email} LIMIT 1`;
    if (users.length === 0) {
      return { error: 'Credenciales inválidas' };
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { error: 'Credenciales inválidas' };
    }

    // Create session payload with user role
    const userRole = user.role || (user.email === 'sacademica@fundacionsanmateosoacha.edu.co' ? 'academic' : 'admin');
    const sessionToken = await encrypt({ 
      adminId: user.id, 
      email: user.email, 
      role: userRole 
    });
    
    (await cookies()).set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return { 
      success: true, 
      redirectUrl: userRole === 'academic' ? '/admin/attendance' : '/admin' 
    };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Ocurrió un error inesperado' };
  }
}

export async function logout() {
  (await cookies()).delete('session');
}

export async function updateContent(contentKey: string, newValue: string, pagePath: string = '/', contentType: string = 'text') {
  try {
    await sql`
      INSERT INTO site_content (content_key, value, page_path, content_type)
      VALUES (${contentKey}, ${newValue}, ${pagePath}, ${contentType})
      ON CONFLICT (content_key) DO UPDATE 
      SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `;
    return { success: true };
  } catch (error) {
    console.error('Update content error:', error);
    return { error: 'Failed to update content' };
  }
}

export async function upsertBlogPost(post: {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_base64?: string;
  published: boolean;
}) {
  try {
    if (post.id) {
      await sql`
        UPDATE blog_posts 
        SET 
          title = ${post.title},
          slug = ${post.slug},
          excerpt = ${post.excerpt},
          content = ${post.content},
          image_base64 = ${post.image_base64 || null},
          published = ${post.published},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${post.id}
      `;
    } else {
      await sql`
        INSERT INTO blog_posts (title, slug, excerpt, content, image_base64, published)
        VALUES (${post.title}, ${post.slug}, ${post.excerpt}, ${post.content}, ${post.image_base64 || null}, ${post.published})
      `;
    }
    return { success: true };
  } catch (error: any) {
    console.error('Blog upsert error:', error);
    return { error: error.message || 'Error saving blog post' };
  }
}

export async function deleteBlogPost(id: string) {
  try {
    await sql`DELETE FROM blog_posts WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    console.error('Blog delete error:', error);
    return { error: 'Failed to delete post' };
  }
}

export async function updateTestimonial(id: string, data: { text: string; author: string; role: string }) {
  try {
    await sql`
      UPDATE testimonials 
      SET text = ${data.text}, author = ${data.author}, role = ${data.role}
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error('Update testimonial error:', error);
    return { error: 'Failed to update testimonial' };
  }
}

export async function addTestimonial(data: { text: string; author: string; role: string }) {
  try {
    await sql`
      INSERT INTO testimonials (text, author, role)
      VALUES (${data.text}, ${data.author}, ${data.role})
    `;
    return { success: true };
  } catch (error) {
    console.error('Add testimonial error:', error);
    return { error: 'Failed to add testimonial' };
  }
}

export async function deleteTestimonial(id: string) {
  try {
    await sql`DELETE FROM testimonials WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    console.error('Delete testimonial error:', error);
    return { error: 'Failed to delete testimonial' };
  }
}
export async function updateDirectoryItem(id: string, data: { title: string; phone: string }) {
  try {
    await sql`
      UPDATE directory_items 
      SET title = ${data.title}, phone = ${data.phone}
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error('Update directory item error:', error);
    return { error: 'Failed to update directory item' };
  }
}

export async function addDirectoryItem(data: { title: string; phone: string }) {
  try {
    await sql`
      INSERT INTO directory_items (title, phone)
      VALUES (${data.title}, ${data.phone})
    `;
    return { success: true };
  } catch (error) {
    console.error('Add directory item error:', error);
    return { error: 'Failed to add directory item' };
  }
}

export async function deleteDirectoryItem(id: string) {
  try {
    await sql`DELETE FROM directory_items WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    console.error('Delete directory item error:', error);
    return { error: 'Failed to delete directory item' };
  }
}

export async function updateProgram(id: string, data: { title: string; subtitle: string; description: string; image_url: string; href: string; category: string; is_featured: boolean; details?: any }) {
  try {
    const detailsJson = data.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details)) : null;
    await sql`
      UPDATE academic_programs 
      SET 
        title = ${data.title}, 
        subtitle = ${data.subtitle}, 
        description = ${data.description}, 
        image_url = ${data.image_url}, 
        href = ${data.href}, 
        category = ${data.category},
        is_featured = ${data.is_featured},
        details = ${detailsJson}::jsonb
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error('Update program error:', error);
    return { error: 'Failed to update program' };
  }
}

export async function addProgram(data: { title: string; subtitle: string; description: string; image_url: string; href: string; category: string; is_featured: boolean; details?: any }) {
  try {
    const detailsJson = data.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details)) : null;
    await sql`
      INSERT INTO academic_programs (title, subtitle, description, image_url, href, category, is_featured, details)
      VALUES (${data.title}, ${data.subtitle}, ${data.description}, ${data.image_url}, ${data.href}, ${data.category}, ${data.is_featured}, ${detailsJson}::jsonb)
    `;
    return { success: true };
  } catch (error) {
    console.error('Add program error:', error);
    return { error: 'Failed to add program' };
  }
}

export async function deleteProgram(id: string) {
  try {
    await sql`DELETE FROM academic_programs WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    console.error('Delete program error:', error);
    return { error: 'Failed to delete program' };
  }
}

export async function updateProgramsOrder(orderedIds: string[]) {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await sql`UPDATE academic_programs SET order_index = ${i} WHERE id = ${orderedIds[i]}`;
    }
    return { success: true };
  } catch (error) {
    console.error('Update programs order error:', error);
    return { error: 'Failed to update order' };
  }
}

export async function updateNewsEvent(id: string, data: { title: string; description: string; image_url: string; date_text: string; category: string; link: string }) {
  try {
    await sql`
      UPDATE news_events 
      SET 
        title = ${data.title}, 
        description = ${data.description}, 
        image_url = ${data.image_url}, 
        date_text = ${data.date_text}, 
        category = ${data.category},
        link = ${data.link}
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error('Update news error:', error);
    return { error: 'Failed to update news event' };
  }
}

export async function addNewsEvent(data: { title: string; description: string; image_url: string; date_text: string; category: string; link: string }) {
  try {
    await sql`
      INSERT INTO news_events (title, description, image_url, date_text, category, link)
      VALUES (${data.title}, ${data.description}, ${data.image_url}, ${data.date_text}, ${data.category}, ${data.link})
    `;
    return { success: true };
  } catch (error) {
    console.error('Add news error:', error);
    return { error: 'Failed to add news event' };
  }
}

export async function deleteNewsEvent(id: string) {
  try {
    await sql`DELETE FROM news_events WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    console.error('Delete news error:', error);
    return { error: 'Failed to delete news event' };
  }
}

export async function updateGalleryItem(id: string, data: { image_url: string; thumb_url: string; span_class: string }) {
  try {
    await sql`
      UPDATE gallery_items 
      SET 
        image_url = ${data.image_url}, 
        thumb_url = ${data.thumb_url}, 
        span_class = ${data.span_class}
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error('Update gallery error:', error);
    return { error: 'Failed to update gallery item' };
  }
}

export async function addGalleryItem(data: { image_url: string; thumb_url: string; span_class: string }) {
  try {
    await sql`
      INSERT INTO gallery_items (image_url, thumb_url, span_class)
      VALUES (${data.image_url}, ${data.thumb_url}, ${data.span_class})
    `;
    return { success: true };
  } catch (error) {
    console.error('Add gallery error:', error);
    return { error: 'Failed to add gallery item' };
  }
}

export async function deleteGalleryItem(id: string) {
  try {
    await sql`DELETE FROM gallery_items WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    console.error('Delete gallery error:', error);
    return { error: 'Failed to delete gallery item' };
  }
}
export async function updateCalendarEvent(id: string, data: { title: string; description: string; start_date: string; end_date: string; type: string; button_text?: string; button_link?: string }) {
  try {
    await sql`
      UPDATE academic_calendar 
      SET 
        title = ${data.title}, 
        description = ${data.description}, 
        start_date = ${data.start_date}, 
        end_date = ${data.end_date || null}, 
        type = ${data.type},
        button_text = ${data.button_text || null},
        button_link = ${data.button_link || null}
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error('Update calendar error:', error);
    return { error: 'Failed to update calendar event' };
  }
}

export async function addCalendarEvent(data: { title: string; description: string; start_date: string; end_date: string; type: string; button_text?: string; button_link?: string }) {
  try {
    await sql`
      INSERT INTO academic_calendar (title, description, start_date, end_date, type, button_text, button_link)
      VALUES (${data.title}, ${data.description}, ${data.start_date}, ${data.end_date || null}, ${data.type}, ${data.button_text || null}, ${data.button_link || null})
    `;
    return { success: true };
  } catch (error) {
    console.error('Add calendar error:', error);
    return { error: 'Failed to add calendar event' };
  }
}

export async function deleteCalendarEvent(id: string) {
  try {
    await sql`DELETE FROM academic_calendar WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    console.error('Delete calendar error:', error);
    return { error: 'Failed to delete calendar event' };
  }
}

export async function addFAQ(data: { question: string; answer: string; category: string; order_index: number }) {
  try {
    await sql`
      INSERT INTO faqs (question, answer, category, order_index, is_active)
      VALUES (${data.question}, ${data.answer}, ${data.category || 'General'}, ${data.order_index}, true)
    `;
    return { success: true };
  } catch (error) {
    console.error('Add FAQ error:', error);
    return { error: 'Failed to add FAQ' };
  }
}

export async function updateFAQ(id: string | number, data: { question: string; answer: string; category: string; order_index: number }) {
  try {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    await sql`
      UPDATE faqs 
      SET question = ${data.question}, answer = ${data.answer}, category = ${data.category || 'General'}, order_index = ${data.order_index}
      WHERE id = ${numericId}
    `;
    return { success: true };
  } catch (error) {
    console.error('Update FAQ error:', error);
    return { error: 'Failed to update FAQ' };
  }
}

export async function deleteFAQ(id: string | number) {
  try {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    await sql`DELETE FROM faqs WHERE id = ${numericId}`;
    return { success: true };
  } catch (error) {
    console.error('Delete FAQ error:', error);
    return { error: 'Failed to delete FAQ' };
  }
}

export async function addNormativityDocument(data: {
  title: string;
  category_key: string;
  file_name?: string;
  file_base64?: string;
  external_link?: string;
}) {
  try {
    await sql`
      INSERT INTO normativity_documents (title, category_key, file_name, file_base64, external_link, order_index)
      VALUES (
        ${data.title},
        ${data.category_key},
        ${data.file_name || null},
        ${data.file_base64 || null},
        ${data.external_link || null},
        COALESCE((SELECT MAX(order_index) + 1 FROM normativity_documents WHERE category_key = ${data.category_key}), 0)
      )
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Add normativity document error:', error);
    return { error: error.message || 'Failed to add document' };
  }
}

export async function updateNormativityDocument(
  id: string,
  data: {
    title: string;
    category_key: string;
    file_name?: string;
    file_base64?: string;
    external_link?: string;
    order_index?: number;
  }
) {
  try {
    await sql`
      UPDATE normativity_documents
      SET
        title = ${data.title},
        category_key = ${data.category_key},
        file_name = ${data.file_name !== undefined ? data.file_name : null},
        file_base64 = ${data.file_base64 !== undefined ? data.file_base64 : null},
        external_link = ${data.external_link !== undefined ? data.external_link : null},
        order_index = ${data.order_index !== undefined ? data.order_index : 0},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}::uuid
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Update normativity document error:', error);
    return { error: error.message || 'Failed to update document' };
  }
}

export async function deleteNormativityDocument(id: string) {
  try {
    await sql`DELETE FROM normativity_documents WHERE id = ${id}::uuid`;
    return { success: true };
  } catch (error: any) {
    console.error('Delete normativity document error:', error);
    return { error: error.message || 'Failed to delete document' };
  }
}

export async function getNavbarSettings() {
  try {
    const results = await sql`
      SELECT content_key, value FROM site_content 
      WHERE content_key IN ('navbar_inscripciones_text', 'navbar_inscripciones_link')
    `;
    const settings: Record<string, string> = {};
    for (const row of results) {
      settings[row.content_key] = row.value;
    }
    return {
      text: settings['navbar_inscripciones_text'] || 'Inscripciones',
      link: settings['navbar_inscripciones_link'] || 'https://fundacionsanmateosoacha.escalapages.com/centro-de-ventas'
    };
  } catch (error) {
    console.error('Error fetching navbar settings:', error);
    return {
      text: 'Inscripciones',
      link: 'https://fundacionsanmateosoacha.escalapages.com/centro-de-ventas'
    };
  }
}

export async function getFooterSettings() {
  try {
    const results = await sql`
      SELECT content_key, value FROM site_content 
      WHERE content_key LIKE 'footer_%'
    `;
    const settings: Record<string, string> = {};
    for (const row of results) {
      settings[row.content_key] = row.value;
    }
    return settings;
  } catch (error) {
    console.error('Error fetching footer settings:', error);
    return {};
  }
}

export async function getFooterAddresses() {
  try {
    return await sql`SELECT id, name, address, order_index FROM footer_addresses ORDER BY order_index ASC`;
  } catch (error) {
    console.error('Error fetching footer addresses:', error);
    return [];
  }
}

export async function addFooterAddress(name: string, address: string, orderIndex = 0) {
  try {
    const res = await sql`
      INSERT INTO footer_addresses (name, address, order_index)
      VALUES (${name}, ${address}, ${orderIndex})
      RETURNING id, name, address, order_index
    `;
    return { success: true, item: res[0] };
  } catch (error: any) {
    console.error('Error adding footer address:', error);
    return { error: error.message || 'Failed to add address' };
  }
}

export async function deleteFooterAddress(id: string) {
  try {
    await sql`DELETE FROM footer_addresses WHERE id = ${id}::uuid`;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting footer address:', error);
    return { error: error.message || 'Failed to delete address' };
  }
}

export async function getFooterSocials() {
  try {
    return await sql`SELECT id, name, url, icon FROM footer_socials`;
  } catch (error) {
    console.error('Error fetching footer socials:', error);
    return [];
  }
}

export async function addFooterSocial(name: string, url: string, icon: string) {
  try {
    const res = await sql`
      INSERT INTO footer_socials (name, url, icon)
      VALUES (${name}, ${url}, ${icon})
      RETURNING id, name, url, icon
    `;
    return { success: true, item: res[0] };
  } catch (error: any) {
    console.error('Error adding footer social:', error);
    return { error: error.message || 'Failed to add social' };
  }
}

export async function deleteFooterSocial(id: string) {
  try {
    await sql`DELETE FROM footer_socials WHERE id = ${id}::uuid`;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting footer social:', error);
    return { error: error.message || 'Failed to delete social' };
  }
}

export async function updateFooterAddress(id: string, name: string, address: string, orderIndex = 0) {
  try {
    await sql`
      UPDATE footer_addresses 
      SET name = ${name}, address = ${address}, order_index = ${orderIndex}
      WHERE id = ${id}::uuid
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating footer address:', error);
    return { error: error.message || 'Failed to update address' };
  }
}

export async function updateFooterSocial(id: string, name: string, url: string, icon: string) {
  try {
    await sql`
      UPDATE footer_socials 
      SET name = ${name}, url = ${url}, icon = ${icon}
      WHERE id = ${id}::uuid
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating footer social:', error);
    return { error: error.message || 'Failed to update social' };
  }
}

export async function getFooterCertifications() {
  try {
    return await sql`SELECT id, name, image_url, order_index FROM footer_certifications ORDER BY order_index ASC`;
  } catch (error) {
    console.error('Error fetching footer certifications:', error);
    return [];
  }
}

export async function addFooterCertification(name: string, imageUrl: string, orderIndex = 0) {
  try {
    const res = await sql`
      INSERT INTO footer_certifications (name, image_url, order_index)
      VALUES (${name}, ${imageUrl}, ${orderIndex})
      RETURNING id, name, image_url, order_index
    `;
    return { success: true, item: res[0] };
  } catch (error: any) {
    console.error('Error adding footer certification:', error);
    return { error: error.message || 'Failed to add certification' };
  }
}

export async function updateFooterCertification(id: string, name: string, imageUrl: string, orderIndex = 0) {
  try {
    await sql`
      UPDATE footer_certifications 
      SET name = ${name}, image_url = ${imageUrl}, order_index = ${orderIndex}
      WHERE id = ${id}::uuid
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating footer certification:', error);
    return { error: error.message || 'Failed to update certification' };
  }
}

export async function deleteFooterCertification(id: string) {
  try {
    await sql`DELETE FROM footer_certifications WHERE id = ${id}::uuid`;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting footer certification:', error);
    return { error: error.message || 'Failed to delete certification' };
  }
}

export async function setEnrollmentStudent(studentId: string | null) {
  try {
    await sql`
      INSERT INTO site_content (content_key, content_type, value, page_path)
      VALUES ('enrollment_active_student_id', 'text', ${studentId || ''}, '/admin/attendance')
      ON CONFLICT (content_key) DO UPDATE SET value = EXCLUDED.value
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Error setting enrollment student:', error);
    return { error: error.message || 'Failed to set enrollment mode' };
  }
}

export async function linkStudentTag(studentId: string, tagUid: string) {
  try {
    // Check if tag is already linked
    const existing = await sql`
      SELECT id, nombre FROM students 
      WHERE rfid_tag_uid = ${tagUid} AND id != ${studentId}::uuid 
      LIMIT 1
    `;
    if (existing.length > 0) {
      return { error: `Esta tarjeta ya está vinculada a ${existing[0].nombre}` };
    }

    await sql`
      UPDATE students 
      SET rfid_tag_uid = ${tagUid} 
      WHERE id = ${studentId}::uuid
    `;

    // Backfill previous unassigned attendance events for this card UID
    await sql`
      UPDATE attendance_events 
      SET student_id = ${studentId}::uuid
      WHERE rfid_tag_uid = ${tagUid} AND student_id IS NULL
    `;

    return { success: true };
  } catch (error: any) {
    console.error('Error linking tag to student:', error);
    return { error: error.message || 'Failed to link card' };
  }
}

export async function unlinkStudentTag(studentId: string) {
  try {
    await sql`
      UPDATE students 
      SET rfid_tag_uid = NULL 
      WHERE id = ${studentId}::uuid
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Error unlinking student tag:', error);
    return { error: error.message || 'Failed to unlink card' };
  }
}

export async function updateStudentDetails(studentId: string, data: { nombre?: string; grado?: string; activo?: boolean }) {
  try {
    const nombre = data.nombre?.trim() || null;
    const grado = data.grado?.trim() || null;
    const activo = data.activo ?? true;

    await sql`
      UPDATE students 
      SET 
        nombre = COALESCE(${nombre}, nombre),
        grado = COALESCE(${grado}, grado),
        activo = ${activo}
      WHERE id = ${studentId}::uuid
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating student details:', error);
    return { error: error.message || 'Error al actualizar estudiante' };
  }
}

export async function createStudent(data: { nombre: string; grado: string; rfid_tag_uid?: string }) {
  try {
    const nombre = data.nombre.trim();
    const grado = data.grado.trim();
    const rfidTagUid = data.rfid_tag_uid?.trim() || null;

    if (!nombre || !grado) {
      return { error: 'Nombre y Grado son obligatorios' };
    }

    await sql`
      INSERT INTO students (nombre, grado, rfid_tag_uid, activo)
      VALUES (${nombre}, ${grado}, ${rfidTagUid}, TRUE)
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Error creating student:', error);
    return { error: error.message || 'Error al crear estudiante' };
  }
}

export async function bulkUpdateStudentGrado(studentIds: string[], newGrado: string) {
  try {
    if (!studentIds || studentIds.length === 0 || !newGrado) {
      return { error: 'Selecciona al menos un estudiante y un grado válido' };
    }

    const trimmedGrado = newGrado.trim();
    await sql`
      UPDATE students 
      SET grado = ${trimmedGrado} 
      WHERE id = ANY(${studentIds}::uuid[])
    `;
    return { success: true, count: studentIds.length };
  } catch (error: any) {
    console.error('Error bulk updating student grado:', error);
    return { error: error.message || 'Error al actualizar grados en lote' };
  }
}

export async function deleteStudent(studentId: string) {
  try {
    await sql`DELETE FROM students WHERE id = ${studentId}::uuid`;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return { error: error.message || 'Error al eliminar estudiante' };
  }
}

export async function recordManualAttendance(studentId: string, tipoEvento: 'entrada' | 'salida' = 'entrada') {
  try {
    const studentQuery = await sql`
      SELECT id, nombre, grado, rfid_tag_uid, activo 
      FROM students 
      WHERE id = ${studentId}::uuid 
      LIMIT 1
    `;

    if (studentQuery.length === 0) {
      return { error: 'Usuario no encontrado' };
    }

    const student = studentQuery[0];

    if (!student.activo) {
      return { error: `No se puede registrar ${tipoEvento}. El usuario ${student.nombre} está CONGELADO / APLAZADO.` };
    }

    // Check duplicate manual entry within 5 seconds
    const recent = await sql`
      SELECT id FROM attendance_events
      WHERE student_id = ${student.id}::uuid
        AND tipo_evento = ${tipoEvento}
        AND timestamp > NOW() - INTERVAL '5 seconds'
      LIMIT 1
    `;

    if (recent.length > 0) {
      return { error: `Ya se registró una ${tipoEvento} reciente para ${student.nombre}.` };
    }

    const tagUid = student.rfid_tag_uid || 'MANUAL';

    await sql`
      INSERT INTO attendance_events (
        student_id, rfid_tag_uid, reader_id, tipo_evento, timestamp, origen, sincronizado
      ) VALUES (
        ${student.id}::uuid, ${tagUid}, 'manual-web', ${tipoEvento}, CURRENT_TIMESTAMP, 'manual', true
      )
    `;

    return { success: true, studentName: student.nombre };
  } catch (error: any) {
    console.error('Error recording manual attendance:', error);
    return { error: error.message || 'Error al registrar asistencia manual' };
  }
}

export async function teacherLogin(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' };
  }

  try {
    const teachers = await sql`
      SELECT id, password_hash 
      FROM teachers 
      WHERE email = ${email} 
      LIMIT 1
    `;
    if (teachers.length === 0) {
      return { error: 'Credenciales inválidas' };
    }

    const teacher = teachers[0];
    const passwordMatch = await bcrypt.compare(password, teacher.password_hash);

    if (!passwordMatch) {
      return { error: 'Credenciales inválidas' };
    }

    // Create session
    const sessionToken = await encrypt({ teacherId: teacher.id });
    
    (await cookies()).set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return { success: true };
  } catch (error) {
    console.error('Teacher login error:', error);
    return { error: 'Ocurrió un error inesperado' };
  }
}

// ==========================================
// DOCUMENT VERIFICATION SYSTEM ACTIONS
// ==========================================

export async function getNextDocumentConsecutivo() {
  try {
    const year = new Date().getFullYear();
    const result = await sql`
      SELECT consecutivo 
      FROM issued_documents 
      WHERE consecutivo LIKE ${`FSM-${year}-%`} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    if (result.length === 0) {
      return `FSM-${year}-00001`;
    }
    const lastConsecutivo = result[0].consecutivo;
    const parts = lastConsecutivo.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    const nextNum = isNaN(num) ? 1 : num + 1;
    return `FSM-${year}-${String(nextNum).padStart(5, '0')}`;
  } catch (error) {
    const year = new Date().getFullYear();
    return `FSM-${year}-00001`;
  }
}

export async function createIssuedDocument(data: {
  consecutivo?: string;
  student_nombre: string;
  student_documento?: string;
  tipo_documento: string;
  programa_curso: string;
  fecha_expedicion?: string;
  folio?: string;
  libro?: string;
  notas?: string;
  pdf_url?: string;
}) {
  try {
    const studentNombre = data.student_nombre.trim();
    const tipoDocumento = data.tipo_documento.trim();
    const programaCurso = data.programa_curso.trim();
    let consecutivo = data.consecutivo?.trim();

    if (!studentNombre || !tipoDocumento || !programaCurso) {
      return { error: 'Nombre, Tipo de Documento y Programa son obligatorios' };
    }

    if (!consecutivo) {
      consecutivo = await getNextDocumentConsecutivo();
    }

    const studentDocumento = data.student_documento?.trim() || null;
    const fechaExpedicion = data.fecha_expedicion || new Date().toISOString().split('T')[0];
    const folio = data.folio?.trim() || null;
    const libro = data.libro?.trim() || null;
    const notas = data.notas?.trim() || null;
    const pdfUrl = data.pdf_url?.trim() || null;

    await sql`
      INSERT INTO issued_documents (
        consecutivo, student_nombre, student_documento, tipo_documento,
        programa_curso, fecha_expedicion, folio, libro, estado, notas, pdf_url
      ) VALUES (
        ${consecutivo}, ${studentNombre}, ${studentDocumento}, ${tipoDocumento},
        ${programaCurso}, ${fechaExpedicion}::date, ${folio}, ${libro}, 'valido', ${notas}, ${pdfUrl}
      )
    `;

    return { success: true, consecutivo };
  } catch (error: any) {
    console.error('Error creating issued document:', error);
    if (error.message?.includes('unique') || error.message?.includes('duplicate key')) {
      return { error: `El consecutivo "${data.consecutivo}" ya existe. Por favor usa un código único.` };
    }
    return { error: error.message || 'Error al expedir documento' };
  }
}

export async function updateIssuedDocument(id: string, data: {
  consecutivo?: string;
  student_nombre?: string;
  student_documento?: string;
  tipo_documento?: string;
  programa_curso?: string;
  fecha_expedicion?: string;
  folio?: string;
  libro?: string;
  estado?: string;
  notas?: string;
  pdf_url?: string;
}) {
  try {
    const studentNombre = data.student_nombre?.trim() || null;
    const tipoDocumento = data.tipo_documento?.trim() || null;
    const programaCurso = data.programa_curso?.trim() || null;
    const consecutivo = data.consecutivo?.trim() || null;
    const studentDocumento = data.student_documento?.trim() || null;
    const fechaExpedicion = data.fecha_expedicion || null;
    const folio = data.folio?.trim() || null;
    const libro = data.libro?.trim() || null;
    const estado = data.estado || null;
    const notas = data.notas?.trim() || null;
    const pdfUrl = data.pdf_url?.trim() || null;

    await sql`
      UPDATE issued_documents
      SET 
        consecutivo = COALESCE(${consecutivo}, consecutivo),
        student_nombre = COALESCE(${studentNombre}, student_nombre),
        student_documento = COALESCE(${studentDocumento}, student_documento),
        tipo_documento = COALESCE(${tipoDocumento}, tipo_documento),
        programa_curso = COALESCE(${programaCurso}, programa_curso),
        fecha_expedicion = COALESCE(${fechaExpedicion}::date, fecha_expedicion),
        folio = COALESCE(${folio}, folio),
        libro = COALESCE(${libro}, libro),
        estado = COALESCE(${estado}, estado),
        notas = COALESCE(${notas}, notas),
        pdf_url = COALESCE(${pdfUrl}, pdf_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}::uuid
    `;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating issued document:', error);
    return { error: error.message || 'Error al actualizar documento' };
  }
}

export async function toggleDocumentStatus(id: string, newEstado: string) {
  try {
    await sql`
      UPDATE issued_documents 
      SET estado = ${newEstado}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${id}::uuid
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling document status:', error);
    return { error: error.message || 'Error al cambiar estado del documento' };
  }
}

export async function deleteIssuedDocument(id: string) {
  try {
    await sql`DELETE FROM issued_documents WHERE id = ${id}::uuid`;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting issued document:', error);
    return { error: error.message || 'Error al eliminar documento' };
  }
}

export async function getAbsentStudentsReport(targetDate?: string, targetShift?: string) {
  try {
    const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Bogota' });
    const dateStr = targetDate || todayStr;

    // Check total attendance events on targetDate
    const eventCountRes = await sql`
      SELECT COUNT(*)::int as count
      FROM attendance_events
      WHERE DATE(timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    `;
    const totalScans = eventCountRes[0]?.count || 0;

    // Determine day of week (0 = Sun, 6 = Sat)
    const dateObj = new Date(`${dateStr}T12:00:00-05:00`);
    const dayOfWeek = dateObj.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;

    // Fetch active students without attendance events on targetDate
    const rows = await sql`
      SELECT 
        s.id as student_id,
        s.nombre,
        s.grado,
        s.telefono,
        s.rfid_tag_uid,
        CASE 
          WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
          WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
          ELSE 'DIURNO'
        END as turno_calculado,
        ae.id as event_id,
        ae.timestamp::text as hora_entrada,
        af.id as followup_id,
        af.se_llamo,
        af.estado_llamada,
        af.comentarios,
        af.excusa_url,
        af.registrado_por,
        af.updated_at::text as fecha_seguimiento
      FROM students s
      LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
      LEFT JOIN absence_followups af ON s.id = af.student_id AND af.fecha = ${dateStr}::date
      WHERE s.activo = TRUE
        AND ae.id IS NULL
      ORDER BY turno_calculado, s.grado, s.nombre
    `;

    // Smart shift filtering:
    // If targetShift is specific ('NOCHE', 'DIURNO', 'SABADO'), use it.
    // If targetShift is 'ALL', return all.
    // If targetShift is undefined or 'AUTO', use smart day-of-week rule (exclude Sábado on weekdays).
    let filtered = rows;
    if (targetShift && targetShift !== 'ALL' && targetShift !== 'AUTO') {
      filtered = rows.filter((r: any) => r.turno_calculado === targetShift);
    } else if (!targetShift || targetShift === 'AUTO') {
      if (isSaturday) {
        filtered = rows.filter((r: any) => r.turno_calculado === 'SABADO');
      } else if (!isSunday) {
        filtered = rows.filter((r: any) => r.turno_calculado !== 'SABADO');
      }
    }

    return { 
      success: true, 
      date: dateStr, 
      totalScansOnDate: totalScans,
      dayOfWeek,
      isFutureOrZeroScan: totalScans === 0,
      absentStudents: filtered 
    };
  } catch (error: any) {
    console.error('Error fetching absent students report:', error);
    return { error: error.message || 'Error al obtener reporte de ausencias' };
  }
}

export async function saveAbsenceFollowup(data: {
  studentId: string;
  fecha: string;
  turno: string;
  seLlamo: boolean;
  estadoLlamada: string;
  comentarios: string;
  excusaUrl?: string;
  registradoPor?: string;
}) {
  try {
    await sql`
      INSERT INTO absence_followups (
        student_id, fecha, turno, se_llamo, estado_llamada, comentarios, excusa_url, registrado_por, updated_at
      ) VALUES (
        ${data.studentId}::uuid, ${data.fecha}::date, ${data.turno}, ${data.seLlamo}, 
        ${data.estadoLlamada}, ${data.comentarios || ''}, ${data.excusaUrl || null}, 
        ${data.registradoPor || 'Secretaría'}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (student_id, fecha) 
      DO UPDATE SET
        turno = EXCLUDED.turno,
        se_llamo = EXCLUDED.se_llamo,
        estado_llamada = EXCLUDED.estado_llamada,
        comentarios = EXCLUDED.comentarios,
        excusa_url = COALESCE(EXCLUDED.excusa_url, absence_followups.excusa_url),
        registrado_por = EXCLUDED.registrado_por,
        updated_at = CURRENT_TIMESTAMP
    `;

    return { success: true };
  } catch (error: any) {
    console.error('Error saving absence followup:', error);
    return { error: error.message || 'Error al guardar seguimiento de ausencia' };
  }
}

export async function getPendingAbsenceAlertsCount() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Count explicit absence followups flagged as pending or un-contacted
    const res = await sql`
      SELECT COUNT(*)::int as pending_count
      FROM absence_followups af
      WHERE (af.se_llamo IS NULL OR af.se_llamo = FALSE OR af.estado_llamada = 'pendiente' OR af.estado_llamada = 'no_contesto')
    `;

    return { success: true, pendingCount: res[0]?.pending_count || 0 };
  } catch (error: any) {
    console.error('Error counting pending absence alerts:', error);
    return { success: false, pendingCount: 0 };
  }
}

