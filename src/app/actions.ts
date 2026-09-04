'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '@/lib/auditLogger';

export async function login(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' };
  }

  try {
    const users = await sql`SELECT id, nombre, email, password_hash, role, activo, permissions FROM admin_users WHERE email = ${email} LIMIT 1`;
    if (users.length === 0) {
      await logAuditEvent({
        action: 'LOGIN_FALLIDO',
        category: 'AUTH',
        details: `Intento de inicio de sesión fallido (usuario no encontrado): ${email}`,
        userEmail: email,
      });
      return { error: 'Credenciales inválidas' };
    }

    const user = users[0];
    if (user.activo === false) {
      await logAuditEvent({
        action: 'LOGIN_BLOQUEADO',
        category: 'AUTH',
        details: `Intento de acceso bloqueado (cuenta inactiva): ${email}`,
        userEmail: email,
        userName: user.nombre,
      });
      return { error: 'Su usuario se encuentra inactivo. Por favor contacte a la administración.' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      await logAuditEvent({
        action: 'LOGIN_FALLIDO',
        category: 'AUTH',
        details: `Intento de inicio de sesión fallido (contraseña incorrecta): ${email}`,
        userEmail: email,
        userName: user.nombre,
      });
      return { error: 'Credenciales inválidas' };
    }

    // Create session payload with user role & permissions
    const userRole = user.role || (user.email === 'sacademica@fundacionsanmateosoacha.edu.co' ? 'academic' : 'admin');
    const permissions = user.permissions || ['attendance_view', 'attendance_edit', 'students_manage'];
    const sessionToken = await encrypt({ 
      adminId: user.id,
      teacherId: (userRole === 'teacher' || permissions.includes('mobile_attendance')) ? user.id : undefined,
      nombre: user.nombre || user.email,
      email: user.email, 
      role: userRole,
      permissions
    });
    
    (await cookies()).set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    await logAuditEvent({
      action: 'LOGIN_EXITOSO',
      category: 'AUTH',
      details: `Inicio de sesión exitoso como [${userRole}] - ${user.nombre || user.email}`,
      userEmail: user.email,
      userRole,
      userName: user.nombre,
      metadata: { role: userRole, permissions }
    });

    const redirectUrl = userRole === 'teacher' 
      ? '/teacher/attendance' 
      : (userRole === 'academic' ? '/admin/attendance' : '/admin');

    return { 
      success: true, 
      redirectUrl 
    };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Ocurrió un error inesperado' };
  }
}

export async function logout() {
  await logAuditEvent({
    action: 'LOGOUT',
    category: 'AUTH',
    details: 'Cierre de sesión de usuario',
  });
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

export async function recordManualAttendance(
  studentId: string, 
  tipoEvento: 'entrada' | 'salida' = 'entrada',
  sede: string = 'Sede 1',
  observaciones: string = ''
) {
  try {
    if (!studentId) {
      return { error: 'ID de estudiante no proporcionado' };
    }

    let student: any = null;

    const normRes = await sql`
      SELECT sn.id, sn.nombre_original as nombre, sn.rfid_tag_uid, sn.estado as norm_estado, s.id as legacy_id
      FROM students_normalized sn
      LEFT JOIN students s ON UPPER(TRIM(s.nombre)) = UPPER(TRIM(sn.nombre_original)) OR s.id = sn.id
      WHERE sn.id = ${studentId}::uuid OR s.id = ${studentId}::uuid
      LIMIT 1
    `;

    if (normRes.length > 0) {
      const row = normRes[0];
      student = {
        id: row.legacy_id || row.id,
        student_id: row.id,
        nombre: row.nombre,
        rfid_tag_uid: row.rfid_tag_uid,
        activo: row.norm_estado === 'ACTIVO' || row.norm_estado == null
      };
    } else {
      const legacyRes = await sql`
        SELECT id, nombre, rfid_tag_uid, activo 
        FROM students 
        WHERE id = ${studentId}::uuid 
        LIMIT 1
      `;
      if (legacyRes.length > 0) {
        const row = legacyRes[0];
        student = {
          id: row.id,
          student_id: row.id,
          nombre: row.nombre,
          rfid_tag_uid: row.rfid_tag_uid,
          activo: Boolean(row.activo)
        };
      }
    }

    if (!student) {
      return { error: 'Usuario no encontrado en la base de datos' };
    }

    const targetUuid = student.id || student.student_id;
    if (!targetUuid) {
      return { error: 'ID de estudiante no válido' };
    }

    // Check duplicate manual entry within 5 seconds
    const recent = await sql`
      SELECT id FROM attendance_events
      WHERE student_id = ${targetUuid}::uuid
        AND tipo_evento = ${tipoEvento}
        AND timestamp > NOW() - INTERVAL '5 seconds'
      LIMIT 1
    `;

    if (recent.length > 0) {
      return { error: `Ya se registró una ${tipoEvento} reciente para ${student.nombre}.` };
    }

    const tagUid = student.rfid_tag_uid || 'MANUAL';
    const cleanSede = sede.trim() || 'Sede 1';
    const cleanObs = observaciones.trim() || null;

    await sql`
      INSERT INTO attendance_events (
        student_id, rfid_tag_uid, reader_id, tipo_evento, timestamp, origen, sincronizado, sede, observaciones
      ) VALUES (
        ${targetUuid}::uuid, ${tagUid}, 'manual-web', ${tipoEvento}, CURRENT_TIMESTAMP, 'manual', true, ${cleanSede}, ${cleanObs}
      )
    `;

    await logAuditEvent({
      action: 'ASISTENCIA_MANUAL_PANEL',
      category: 'ATTENDANCE',
      details: `Marcó pase manual [${tipoEvento.toUpperCase()}] para el estudiante ${student.nombre} en ${cleanSede}${cleanObs ? ` (Obs: ${cleanObs})` : ''}`,
      metadata: { studentId: targetUuid, estudiante: student.nombre, tipoEvento, sede: cleanSede, observaciones: cleanObs }
    });

    return { success: true, studentName: student.nombre };
  } catch (error: any) {
    console.error('Error recording manual attendance:', error);
    return { error: error.message || 'Error al registrar asistencia manual' };
  }
}

export async function updateStudentAbsenceExcuse(
  studentId: string,
  sessionId: string,
  estado: string,
  observaciones: string
) {
  try {
    const cleanObs = observaciones.trim() || null;
    const cleanEstado = estado.trim() || 'AUSENTE';

    await sql`
      INSERT INTO attendance_records_normalized (
        student_id, session_id, estado, fuente, observaciones, sede
      ) VALUES (
        ${studentId}::uuid, ${sessionId}::uuid, ${cleanEstado}, 'MANUAL', ${cleanObs}, 'Sede 1'
      )
      ON CONFLICT (student_id, session_id) 
      DO UPDATE SET
        estado = EXCLUDED.estado,
        observaciones = EXCLUDED.observaciones,
        updated_at = CURRENT_TIMESTAMP
    `;

    const stInfo = await sql`
      SELECT sn.nombre_original, s.nombre 
      FROM students_normalized sn 
      LEFT JOIN students s ON s.id = sn.id
      WHERE sn.id = ${studentId}::uuid OR s.id = ${studentId}::uuid
      LIMIT 1
    `;
    const sessInfo = await sql`SELECT fecha FROM class_sessions WHERE id = ${sessionId}::uuid LIMIT 1`;
    const stName = stInfo[0]?.nombre_original || stInfo[0]?.nombre || studentId;
    const sessDate = sessInfo[0]?.fecha ? new Date(sessInfo[0].fecha).toISOString().split('T')[0] : sessionId;

    await logAuditEvent({
      action: cleanEstado === 'EXCUSA_MEDICA' ? 'EXCUSA_REGISTRADA' : 'ASISTENCIA_MODIFICADA',
      category: 'ATTENDANCE',
      details: `${cleanEstado === 'EXCUSA_MEDICA' ? 'Cargó excusa médica' : 'Modificó asistencia'} para ${stName} (Fecha ${sessDate}) a [${cleanEstado}]${cleanObs ? `: "${cleanObs}"` : ''}`,
      metadata: { studentId, sessionId, estudiante: stName, fecha: sessDate, estado: cleanEstado, observaciones: cleanObs }
    });

    revalidatePath(`/admin/attendance/students/${studentId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating absence excuse:', error);
    return { error: error.message || 'Error al actualizar excusa' };
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

    await logAuditEvent({
      action: 'DOCUMENT_ISSUED',
      category: 'CONTENT',
      details: `Expedido documento oficial ${tipoDocumento} (${consecutivo}) para el estudiante ${studentNombre}`,
      metadata: {
        consecutivo,
        student_nombre: studentNombre,
        student_documento: studentDocumento,
        tipo_documento: tipoDocumento,
        programa_curso: programaCurso,
        folio,
        libro,
        fecha_expedicion: fechaExpedicion
      }
    });

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

    await logAuditEvent({
      action: 'DOCUMENT_UPDATED',
      category: 'CONTENT',
      details: `Actualizado documento oficial ${consecutivo || id} (${studentNombre || ''})`,
      metadata: {
        id,
        consecutivo,
        student_nombre: studentNombre,
        tipo_documento: tipoDocumento,
        estado
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating issued document:', error);
    return { error: error.message || 'Error al actualizar documento' };
  }
}

export async function toggleDocumentStatus(id: string, newEstado: string) {
  try {
    const existing = await sql`SELECT consecutivo, student_nombre FROM issued_documents WHERE id = ${id}::uuid LIMIT 1`;
    const docInfo = existing.length > 0 ? existing[0] : null;

    await sql`
      UPDATE issued_documents 
      SET estado = ${newEstado}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${id}::uuid
    `;

    await logAuditEvent({
      action: newEstado === 'anulado' ? 'DOCUMENT_ANNULLED' : 'DOCUMENT_ACTIVATED',
      category: 'CONTENT',
      details: `Estado del documento ${docInfo?.consecutivo || id} cambiado a ${newEstado.toUpperCase()}`,
      metadata: {
        id,
        consecutivo: docInfo?.consecutivo,
        student_nombre: docInfo?.student_nombre,
        new_estado: newEstado
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error toggling document status:', error);
    return { error: error.message || 'Error al cambiar estado del documento' };
  }
}

export async function deleteIssuedDocument(id: string) {
  try {
    const existing = await sql`SELECT consecutivo, student_nombre FROM issued_documents WHERE id = ${id}::uuid LIMIT 1`;
    const docInfo = existing.length > 0 ? existing[0] : null;

    await sql`DELETE FROM issued_documents WHERE id = ${id}::uuid`;

    await logAuditEvent({
      action: 'DOCUMENT_DELETED',
      category: 'CONTENT',
      details: `Eliminado documento oficial ${docInfo?.consecutivo || id} (${docInfo?.student_nombre || ''})`,
      metadata: {
        id,
        consecutivo: docInfo?.consecutivo,
        student_nombre: docInfo?.student_nombre
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting issued document:', error);
    return { error: error.message || 'Error al eliminar documento' };
  }
}

export async function searchIssuedDocuments(query: string) {
  try {
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return [];

    const results = await sql`
      SELECT 
        id, consecutivo, student_nombre, student_documento,
        tipo_documento, programa_curso, fecha_expedicion::text,
        folio, libro, estado, notas, pdf_url, created_at::text
      FROM issued_documents
      WHERE UPPER(consecutivo) = ${cleanQuery}
         OR UPPER(student_documento) = ${cleanQuery}
         OR UPPER(student_nombre) LIKE ${`%${cleanQuery}%`}
         OR UPPER(consecutivo) LIKE ${`%${cleanQuery}%`}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return results;
  } catch (error) {
    console.error('Error searching issued documents:', error);
    return [];
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

    // Determine day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const dateObj = new Date(`${dateStr}T12:00:00-05:00`);
    const dayOfWeek = dateObj.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

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

    // Strict day-of-week shift applicability & Calendario B exclusion:
    // 1. Calendario B (CB) students do NOT start classes until September.
    // 2. Weekdays (Mon-Fri): Only DIURNO and NOCHE students have class. SABADO students do NOT have class.
    // 3. Saturdays: Only SABADO students have class. DIURNO and NOCHE students do NOT have class.
    // 4. Sundays: No students have class.
    const isBeforeSept = dateStr < '2026-09-01';
    const validRows = rows.filter((r: any) => {
      if (isBeforeSept && r.grado && r.grado.toUpperCase().includes('CB')) {
        return false; // Calendario B starts in September
      }
      if (isWeekday) {
        return r.turno_calculado === 'DIURNO' || r.turno_calculado === 'NOCHE';
      } else if (isSaturday) {
        return r.turno_calculado === 'SABADO';
      } else {
        return false; // Sunday
      }
    });

    let filtered = validRows;
    if (targetShift && targetShift !== 'ALL' && targetShift !== 'AUTO') {
      filtered = validRows.filter((r: any) => r.turno_calculado === targetShift);
    } else if (!targetShift || targetShift === 'AUTO') {
      if (isSaturday) {
        filtered = validRows.filter((r: any) => r.turno_calculado === 'SABADO');
      } else if (isWeekday) {
        filtered = validRows;
      } else {
        filtered = [];
      }
    }

    // Get list of courses that had at least 1 attendance scan on targetDate
    const activeCoursesRes = await sql`
      SELECT DISTINCT s.grado
      FROM attendance_events ae
      JOIN students s ON ae.student_id = s.id
      WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    `;
    const activeCoursesScanned = activeCoursesRes.map((r: any) => r.grado);

    return { 
      success: true, 
      date: dateStr, 
      totalScansOnDate: totalScans,
      dayOfWeek,
      isWeekday,
      isSaturday,
      isSunday,
      isFutureOrZeroScan: totalScans === 0,
      activeCoursesScanned,
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

    const stInfo = await sql`
      SELECT sn.nombre_original, s.nombre 
      FROM students_normalized sn
      LEFT JOIN students s ON s.id = sn.id
      WHERE sn.id = ${data.studentId}::uuid OR s.id = ${data.studentId}::uuid
      LIMIT 1
    `;
    const stName = stInfo[0]?.nombre_original || stInfo[0]?.nombre || data.studentId;

    await logAuditEvent({
      action: 'SEGUIMIENTO_TELEFONICO',
      category: 'ATTENDANCE',
      details: `Registró seguimiento telefónico para ${stName} (${data.fecha}): [${data.estadoLlamada}] ${data.seLlamo ? '✓ Llamado' : 'Pendiente'}${data.comentarios ? ` - Comentario: "${data.comentarios}"` : ''}`,
      metadata: { ...data, estudiante: stName }
    });

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

export async function getAdminUsersAction() {
  try {
    const users = await sql`
      SELECT id, nombre, email, role, activo, permissions, created_at 
      FROM admin_users 
      ORDER BY created_at DESC, email ASC
    `;
    return users;
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}

export async function createAdminUserAction(formData: FormData) {
  const nombre = (formData.get('nombre') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const role = (formData.get('role') as string) || 'admin';
  const permissionsJson = formData.get('permissions') as string;

  if (!email || !password || !nombre) {
    return { error: 'El nombre, correo electrónico y contraseña son obligatorios.' };
  }

  try {
    const existing = await sql`SELECT id FROM admin_users WHERE email = ${email} LIMIT 1`;
    if (existing.length > 0) {
      return { error: 'Ya existe un usuario registrado con este correo electrónico.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const permissions = permissionsJson ? JSON.parse(permissionsJson) : ['attendance_view'];

    const newUsers = await sql`
      INSERT INTO admin_users (nombre, email, password_hash, role, permissions, activo)
      VALUES (${nombre}, ${email}, ${passwordHash}, ${role}, ${JSON.stringify(permissions)}::jsonb, true)
      RETURNING id
    `;
    const newUserId = newUsers[0].id;

    // If teacher role or mobile_attendance permission, sync to teachers & readers tables
    if (role === 'teacher' || permissions.includes('mobile_attendance')) {
      await sql`
        INSERT INTO teachers (id, nombre, email, password_hash)
        VALUES (${newUserId}::uuid, ${nombre}, ${email}, ${passwordHash})
        ON CONFLICT (id) DO UPDATE SET nombre = ${nombre}, email = ${email}, password_hash = ${passwordHash}
      `;
      const readerId = `movil-${newUserId.slice(0, 8)}`;
      await sql`
        INSERT INTO readers (id, ubicacion, tipo, teacher_id, sede)
        VALUES (${readerId}, ${`Lector Móvil - ${nombre}`}, 'mobile_nfc', ${newUserId}::uuid, 'Sede 1')
        ON CONFLICT (id) DO UPDATE SET teacher_id = ${newUserId}::uuid, ubicacion = ${`Lector Móvil - ${nombre}`}
      `;
    }

    await logAuditEvent({
      action: 'USUARIO_CREADO',
      category: 'USERS',
      details: `Creó nuevo usuario [${role}]: ${nombre} (${email})`,
      metadata: { userId: newUserId, nombre, email, role, permissions }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return { error: 'Error al crear el usuario: ' + (error?.message || 'Error de base de datos') };
  }
}

export async function updateAdminUserAction(userIdOrFormData: string | FormData, maybeFormData?: FormData) {
  let userId = '';
  let formData: FormData;

  if (typeof userIdOrFormData === 'string') {
    userId = userIdOrFormData;
    formData = maybeFormData as FormData;
  } else {
    formData = userIdOrFormData;
    userId = formData.get('userId') as string;
  }

  const nombre = (formData.get('nombre') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const role = (formData.get('role') as string) || 'admin';
  const permissionsJson = formData.get('permissions') as string;

  if (!userId || !email || !nombre) {
    return { error: 'ID de usuario, nombre y correo son obligatorios.' };
  }

  try {
    const existing = await sql`SELECT id FROM admin_users WHERE email = ${email} AND id != ${userId}::uuid LIMIT 1`;
    if (existing.length > 0) {
      return { error: 'Ya existe otro usuario con este correo electrónico.' };
    }

    const permissions = permissionsJson ? JSON.parse(permissionsJson) : ['attendance_view'];

    if (password && password.trim() !== '') {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await sql`
        UPDATE admin_users
        SET 
          nombre = ${nombre},
          email = ${email},
          password_hash = ${passwordHash},
          role = ${role},
          permissions = ${JSON.stringify(permissions)}::jsonb
        WHERE id = ${userId}::uuid
      `;
    } else {
      await sql`
        UPDATE admin_users
        SET 
          nombre = ${nombre},
          email = ${email},
          role = ${role},
          permissions = ${JSON.stringify(permissions)}::jsonb
        WHERE id = ${userId}::uuid
      `;
    }

    if (role === 'teacher' || permissions.includes('mobile_attendance')) {
      await sql`
        INSERT INTO teachers (id, nombre, email)
        VALUES (${userId}::uuid, ${nombre}, ${email})
        ON CONFLICT (id) DO UPDATE SET nombre = ${nombre}, email = ${email}
      `;
      const readerId = `movil-${userId.slice(0, 8)}`;
      await sql`
        INSERT INTO readers (id, ubicacion, tipo, teacher_id, sede)
        VALUES (${readerId}, ${`Lector Móvil - ${nombre}`}, 'mobile_nfc', ${userId}::uuid, 'Sede 1')
        ON CONFLICT (id) DO UPDATE SET teacher_id = ${userId}::uuid, ubicacion = ${`Lector Móvil - ${nombre}`}
      `;
    }

    await logAuditEvent({
      action: 'USUARIO_ACTUALIZADO',
      category: 'USERS',
      details: `Actualizó datos del usuario: ${nombre} (${email}) - Rol [${role}]`,
      metadata: { userId, nombre, email, role, permissions }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    return { error: 'Error al actualizar usuario: ' + (error?.message || 'Error inesperado') };
  }
}

export async function toggleAdminUserStatusAction(userId: string, newStatus: boolean) {
  try {
    await sql`
      UPDATE admin_users
      SET activo = ${newStatus}
      WHERE id = ${userId}::uuid
    `;
    await sql`
      UPDATE teachers
      SET activo = ${newStatus}
      WHERE id = ${userId}::uuid
    `;

    await logAuditEvent({
      action: 'ESTADO_USUARIO_CAMBIADO',
      category: 'USERS',
      details: `${newStatus ? 'Activó' : 'Desactivó'} la cuenta de usuario con ID ${userId}`,
      metadata: { userId, newStatus }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    return { error: error?.message || 'Error al cambiar estado de usuario' };
  }
}

export async function deleteAdminUserAction(userId: string) {
  try {
    const userToDel = await sql`SELECT nombre, email FROM admin_users WHERE id = ${userId}::uuid LIMIT 1`;
    const totalUsers = await sql`SELECT count(*) FROM admin_users`;
    if (parseInt(totalUsers[0].count, 10) <= 1) {
      return { error: 'No se puede eliminar el único usuario administrador del sistema.' };
    }

    await sql`DELETE FROM readers WHERE teacher_id = ${userId}::uuid`;
    await sql`DELETE FROM teachers WHERE id = ${userId}::uuid`;
    await sql`DELETE FROM admin_users WHERE id = ${userId}::uuid`;

    await logAuditEvent({
      action: 'USUARIO_ELIMINADO',
      category: 'USERS',
      details: `Eliminó el usuario: ${userToDel[0]?.nombre || ''} (${userToDel[0]?.email || userId})`,
      metadata: { userId, user: userToDel[0] }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    return { error: error?.message || 'Error al eliminar usuario' };
  }
}

async function checkIsAdminFull(): Promise<{ isAdmin: boolean; email: string }> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return { isAdmin: false, email: '' };
    const payload = await decrypt(session);
    const email = (payload?.email || '').toLowerCase().trim();
    const isAdmin = (
      email === 'admin@fundacionsanmateo.edu.co' || 
      email === 'admin@fundacionsanmateosoacha.edu.co'
    );
    return { isAdmin, email };
  } catch {
    return { isAdmin: false, email: '' };
  }
}

/**
 * Updates or creates a single student attendance record in a class session
 */
export async function updateCellAttendanceAction(
  studentId: string,
  sessionId: string,
  estado: string,
  observaciones: string = ''
) {
  try {
    if (!studentId || !sessionId || !estado) {
      return { error: 'Parámetros incompletos' };
    }

    const { isAdmin } = await checkIsAdminFull();
    const cleanEstado = estado.trim().toUpperCase();
    const cleanObs = observaciones?.trim() || null;

    // Permissions: Non-admins can only submit EXCUSA_MEDICA
    if (!isAdmin && cleanEstado !== 'EXCUSA_MEDICA') {
      return { 
        error: 'Permiso denegado: Solo el Administrador General (admin@fundacionsanmateo.edu.co) puede modificar la asistencia general. Tú puedes registrar excusas médicas.' 
      };
    }

    await sql`
      INSERT INTO attendance_records_normalized (
        student_id, session_id, estado, fuente, observaciones, sede
      ) VALUES (
        ${studentId}::uuid, ${sessionId}::uuid, ${cleanEstado}, 'MANUAL', ${cleanObs}, 'Sede 1'
      )
      ON CONFLICT (student_id, session_id) DO UPDATE 
      SET estado = EXCLUDED.estado, observaciones = EXCLUDED.observaciones, updated_at = CURRENT_TIMESTAMP
    `;

    const stInfo = await sql`
      SELECT sn.nombre_original, s.nombre 
      FROM students_normalized sn
      LEFT JOIN students s ON s.id = sn.id
      WHERE sn.id = ${studentId}::uuid OR s.id = ${studentId}::uuid
      LIMIT 1
    `;
    const sessInfo = await sql`
      SELECT cs.fecha, g.nombre as grupo_nombre
      FROM class_sessions cs
      LEFT JOIN groups g ON g.id = cs.group_id
      WHERE cs.id = ${sessionId}::uuid
      LIMIT 1
    `;

    const stName = stInfo[0]?.nombre_original || stInfo[0]?.nombre || studentId;
    const sessDate = sessInfo[0]?.fecha ? new Date(sessInfo[0].fecha).toISOString().split('T')[0] : sessionId;
    const grpName = sessInfo[0]?.grupo_nombre || '';

    await logAuditEvent({
      action: cleanEstado === 'EXCUSA_MEDICA' ? 'EXCUSA_REGISTRADA' : 'ASISTENCIA_MODIFICADA',
      category: 'ATTENDANCE',
      details: `${cleanEstado === 'EXCUSA_MEDICA' ? 'Registró excusa médica' : 'Modificó asistencia'} para ${stName} ${grpName ? `(${grpName})` : ''} en fecha ${sessDate} a estado [${cleanEstado}]${cleanObs ? ` (Obs: "${cleanObs}")` : ''}`,
      metadata: { studentId, sessionId, estudiante: stName, grupo: grpName, fecha: sessDate, estado: cleanEstado, observaciones: cleanObs }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating cell attendance:', error);
    return { error: error?.message || 'Error al actualizar registro de asistencia' };
  }
}

/**
 * Bulk updates an entire group session on a given date (or creates session if missing)
 */
export async function bulkUpdateGroupSessionStateAction(
  groupId: string,
  fechaStr: string,
  estado: string,
  observaciones: string = ''
) {
  try {
    if (!groupId || !fechaStr || !estado) {
      return { error: 'Parámetros incompletos' };
    }

    const { isAdmin } = await checkIsAdminFull();
    if (!isAdmin) {
      return { 
        error: 'Permiso denegado: El marcado masivo está reservado exclusivamente para el Administrador General (admin@fundacionsanmateo.edu.co).' 
      };
    }

    const cleanEstado = estado.trim().toUpperCase();
    const cleanObs = observaciones?.trim() || null;

    // 1. Ensure class session exists
    let sessionId: string | null = null;
    const existingSession = await sql`
      SELECT id FROM class_sessions 
      WHERE group_id = ${groupId}::uuid AND fecha = ${fechaStr}::date 
      LIMIT 1
    `;

    if (existingSession.length > 0) {
      sessionId = existingSession[0].id;
    } else {
      const dateObj = new Date(fechaStr + 'T12:00:00Z');
      const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
      const diaTexto = dias[dateObj.getUTCDay()];

      const newSession = await sql`
        INSERT INTO class_sessions (group_id, fecha, dia_semana_texto, dia_semana_calculado, activa)
        VALUES (${groupId}::uuid, ${fechaStr}::date, ${diaTexto}, ${diaTexto}, TRUE)
        RETURNING id
      `;
      sessionId = newSession[0].id;
    }

    // 2. Fetch all active enrolled students in this group
    const enrolledStudents = await sql`
      SELECT s.id 
      FROM students_normalized s
      JOIN enrollments e ON e.student_id = s.id
      WHERE e.group_id = ${groupId}::uuid
        AND (e.activo IS NULL OR e.activo = TRUE)
        AND (s.estado IS NULL OR UPPER(s.estado) = 'ACTIVO')
    `;

    if (enrolledStudents.length === 0) {
      return { success: true, count: 0, message: 'No hay estudiantes matriculados en este grupo.' };
    }

    // 3. Update / Insert attendance record for each student
    for (const st of enrolledStudents) {
      await sql`
        INSERT INTO attendance_records_normalized (
          student_id, session_id, estado, fuente, observaciones, sede
        ) VALUES (
          ${st.id}::uuid, ${sessionId}::uuid, ${cleanEstado}, 'MASIVO', ${cleanObs}, 'Sede 1'
        )
        ON CONFLICT (student_id, session_id) DO UPDATE 
        SET estado = EXCLUDED.estado, observaciones = EXCLUDED.observaciones, updated_at = CURRENT_TIMESTAMP
      `;
    }

    const grpInfo = await sql`SELECT nombre FROM groups WHERE id = ${groupId}::uuid LIMIT 1`;
    const grpName = grpInfo[0]?.nombre || groupId;

    await logAuditEvent({
      action: 'MARCADO_MASIVO_FECHA',
      category: 'ATTENDANCE',
      details: `Marcado masivo [${cleanEstado}] aplicado al grupo ${grpName} en fecha ${fechaStr} (${enrolledStudents.length} alumnos)${cleanObs ? ` - Obs: "${cleanObs}"` : ''}`,
      metadata: { groupId, grupo: grpName, fechaStr, estado: cleanEstado, observaciones: cleanObs, count: enrolledStudents.length }
    });

    revalidatePath(`/admin/attendance/group/${groupId}`);
    return { success: true, count: enrolledStudents.length };
  } catch (error: any) {
    console.error('Error bulk updating group session state:', error);
    return { error: error?.message || 'Error al aplicar cambio masivo al grupo' };
  }
}

/**
 * Bulk updates an entire group across a range of dates (e.g. Practicas, Vacaciones, etc.)
 */
export async function bulkUpdateDateRangeGroupStateAction(
  groupId: string,
  startDateStr: string,
  endDateStr: string,
  estado: string,
  observaciones: string = ''
) {
  try {
    if (!groupId || !startDateStr || !endDateStr || !estado) {
      return { error: 'Fechas o parámetros incompletos' };
    }

    const { isAdmin } = await checkIsAdminFull();
    if (!isAdmin) {
      return { 
        error: 'Permiso denegado: El marcado masivo está reservado exclusivamente para el Administrador General (admin@fundacionsanmateo.edu.co).' 
      };
    }

    const start = new Date(startDateStr + 'T00:00:00Z');
    const end = new Date(endDateStr + 'T00:00:00Z');

    if (start > end) {
      return { error: 'La fecha inicial no puede ser posterior a la fecha final' };
    }

    let processedDays = 0;
    const current = new Date(start);

    while (current <= end) {
      const curDateStr = current.toISOString().split('T')[0];
      await bulkUpdateGroupSessionStateAction(groupId, curDateStr, estado, observaciones);
      processedDays++;
      current.setUTCDate(current.getUTCDate() + 1);
    }

    const grpInfo = await sql`SELECT nombre FROM groups WHERE id = ${groupId}::uuid LIMIT 1`;
    const grpName = grpInfo[0]?.nombre || groupId;

    await logAuditEvent({
      action: 'MARCADO_MASIVO_RANGO',
      category: 'ATTENDANCE',
      details: `Marcado masivo [${estado}] en grupo ${grpName} del ${startDateStr} al ${endDateStr} (${processedDays} días procesados)`,
      metadata: { groupId, grupo: grpName, startDateStr, endDateStr, estado, observaciones, processedDays }
    });

    revalidatePath(`/admin/attendance/group/${groupId}`);
    return { success: true, daysCount: processedDays };
  } catch (error: any) {
    console.error('Error in bulk date range update:', error);
    return { error: error?.message || 'Error al procesar rango de fechas' };
  }
}

/**
 * Superadmin Audit Logs Query Action
 */
export async function getAuditLogsAction(filters?: {
  page?: number;
  limit?: number;
  userEmail?: string;
  category?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  try {
    const { isAdmin } = await checkIsAdminFull();
    if (!isAdmin) {
      return { error: 'Permiso denegado: El registro de auditoría es exclusivo para el Administrador General.', logs: [], total: 0 };
    }

    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(10, filters?.limit || 50));
    const offset = (page - 1) * limit;

    const userEmail = filters?.userEmail?.trim() || '';
    const category = filters?.category?.trim() || '';
    const action = filters?.action?.trim() || '';
    const search = filters?.search?.trim() || '';
    const startDate = filters?.startDate?.trim() || '';
    const endDate = filters?.endDate?.trim() || '';

    let logs;
    let countRes;

    if (userEmail || (category && category !== 'ALL') || (action && action !== 'ALL') || startDate || endDate || search) {
      logs = await sql`
        SELECT 
          id,
          user_email,
          user_role,
          user_name,
          action,
          category,
          details,
          metadata,
          ip_address,
          city,
          country,
          user_agent,
          created_at::text as created_at
        FROM audit_logs
        WHERE (
          (${userEmail} = '' OR user_email ILIKE ${'%' + userEmail + '%'}) AND
          (${category} = '' OR ${category} = 'ALL' OR category = ${category}) AND
          (${action} = '' OR ${action} = 'ALL' OR action = ${action}) AND
          (${startDate} = '' OR created_at >= (${startDate} || ' 00:00:00-05')::timestamptz) AND
          (${endDate} = '' OR created_at <= (${endDate} || ' 23:59:59-05')::timestamptz) AND
          (${search} = '' OR details ILIKE ${'%' + search + '%'} OR ip_address ILIKE ${'%' + search + '%'} OR user_name ILIKE ${'%' + search + '%'})
        )
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      countRes = await sql`
        SELECT COUNT(*)::int as total 
        FROM audit_logs
        WHERE (
          (${userEmail} = '' OR user_email ILIKE ${'%' + userEmail + '%'}) AND
          (${category} = '' OR ${category} = 'ALL' OR category = ${category}) AND
          (${action} = '' OR ${action} = 'ALL' OR action = ${action}) AND
          (${startDate} = '' OR created_at >= (${startDate} || ' 00:00:00-05')::timestamptz) AND
          (${endDate} = '' OR created_at <= (${endDate} || ' 23:59:59-05')::timestamptz) AND
          (${search} = '' OR details ILIKE ${'%' + search + '%'} OR ip_address ILIKE ${'%' + search + '%'} OR user_name ILIKE ${'%' + search + '%'})
        )
      `;
    } else {
      logs = await sql`
        SELECT 
          id,
          user_email,
          user_role,
          user_name,
          action,
          category,
          details,
          metadata,
          ip_address,
          city,
          country,
          user_agent,
          created_at::text as created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      countRes = await sql`SELECT COUNT(*)::int as total FROM audit_logs`;
    }

    const total = countRes[0]?.total || 0;

    // Distinct users and categories for filters
    const usersRes = await sql`SELECT DISTINCT user_email FROM audit_logs WHERE user_email IS NOT NULL AND user_email != '' ORDER BY user_email ASC`;
    const users = usersRes.map((u: any) => u.user_email);

    // Stats calculations
    const todayStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE category = 'AUTH' AND action = 'LOGIN_EXITOSO' AND created_at >= (CURRENT_DATE AT TIME ZONE 'America/Bogota'))::int as logins_today,
        COUNT(*) FILTER (WHERE category = 'ATTENDANCE' AND created_at >= (CURRENT_DATE AT TIME ZONE 'America/Bogota'))::int as attendance_changes_today,
        COUNT(DISTINCT ip_address)::int as unique_ips,
        COUNT(DISTINCT user_email)::int as unique_users
      FROM audit_logs
    `;

    return { 
      success: true, 
      logs, 
      total, 
      page, 
      limit, 
      users,
      stats: todayStats[0] || { logins_today: 0, attendance_changes_today: 0, unique_ips: 0, unique_users: 0 }
    };
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return { error: error?.message || 'Error al consultar logs de auditoría', logs: [], total: 0 };
  }
}
