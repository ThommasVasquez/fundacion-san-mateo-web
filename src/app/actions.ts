'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '@/lib/auditLogger';
import { getNextAcademicGroup, normalizeGroupName, getAcademicGroupConfig } from '@/lib/academicCatalog';
import { isColombiaHoliday } from '@/lib/colombiaHolidays';
import { 
  getEffectivePermissions, 
  isSuperAdminEmail, 
  getUserDefaultRoute, 
  userHasPermission 
} from '@/lib/permissions';

/**
 * Obtiene y valida la sesión actual desde las cookies en Server Actions.
 */
export async function getActionSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;
    const payload = await decrypt(session);
    if (!payload || (!payload.adminId && !payload.teacherId)) return null;

    const email = (payload.email || '').toLowerCase().trim();
    const role = (payload.role || 'custom').toLowerCase().trim();
    const isSuperAdmin = isSuperAdminEmail(email);
    const isAdmin = role === 'admin' || isSuperAdmin;
    const permissions = getEffectivePermissions(role, payload.permissions);

    return {
      userId: payload.adminId || payload.teacherId || '',
      email,
      role,
      permissions,
      isAdmin,
      isSuperAdmin,
      hasPermission: (perm: string) => isAdmin || permissions.includes(perm)
    };
  } catch {
    return null;
  }
}

/**
 * Asegura que el usuario de la sesión tenga el permiso requerido para ejecutar la Server Action.
 */
export async function assertActionPermission(requiredPerm: string, errorMsg?: string) {
  const session = await getActionSession();
  if (!session) {
    return { authorized: false, error: 'Sesión no válida o expirada. Por favor inicie sesión nuevamente.', session: null };
  }
  if (!session.hasPermission(requiredPerm)) {
    await logAuditEvent({
      action: 'ACCESS_DENIED',
      category: 'AUTH',
      details: `Intento no autorizado de ejecutar acción que requiere el permiso [${requiredPerm}] por parte de ${session.email} (Rol: ${session.role})`,
      userEmail: session.email,
      userRole: session.role
    });
    return { 
      authorized: false, 
      error: errorMsg || `Permiso denegado: No tienes autorización para realizar esta acción (requiere '${requiredPerm}').`,
      session 
    };
  }
  return { authorized: true, error: null, session };
}

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

    const redirectUrl = getUserDefaultRoute(userRole, permissions, user.email);

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
  const auth = await assertActionPermission('cms_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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
  const auth = await assertActionPermission('cms_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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
  const auth = await assertActionPermission('cms_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    await sql`DELETE FROM blog_posts WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    console.error('Blog delete error:', error);
    return { error: 'Failed to delete post' };
  }
}

export async function updateTestimonial(id: string, data: { text: string; author: string; role: string }) {
  const auth = await assertActionPermission('cms_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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
  const auth = await assertActionPermission('cms_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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
  const auth = await assertActionPermission('cms_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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

export async function updateProgram(id: string, data: { title: string; subtitle: string; description: string; image_url: string; href: string; category: string; is_featured: boolean; details?: any; total_clases?: number | null }) {
  try {
    const detailsJson = data.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details)) : null;
    await sql`ALTER TABLE academic_programs ADD COLUMN IF NOT EXISTS total_clases INTEGER;`.catch(() => []);
    const tc = data.total_clases !== undefined ? (data.total_clases && data.total_clases > 0 ? Math.floor(data.total_clases) : null) : undefined;
    
    if (tc !== undefined) {
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
          details = ${detailsJson}::jsonb,
          total_clases = ${tc}
        WHERE id = ${id}
      `;
    } else {
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
    }
    return { success: true };
  } catch (error) {
    console.error('Update program error:', error);
    return { error: 'Failed to update program' };
  }
}

export async function addProgram(data: { title: string; subtitle: string; description: string; image_url: string; href: string; category: string; is_featured: boolean; details?: any; total_clases?: number | null }) {
  try {
    const detailsJson = data.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details)) : null;
    await sql`ALTER TABLE academic_programs ADD COLUMN IF NOT EXISTS total_clases INTEGER;`.catch(() => []);
    const tc = data.total_clases && data.total_clases > 0 ? Math.floor(data.total_clases) : null;
    await sql`
      INSERT INTO academic_programs (title, subtitle, description, image_url, href, category, is_featured, details, total_clases)
      VALUES (${data.title}, ${data.subtitle}, ${data.description}, ${data.image_url}, ${data.href}, ${data.category}, ${data.is_featured}, ${detailsJson}::jsonb, ${tc})
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
    file_name?: string | null;
    file_base64?: string | null;
    external_link?: string | null;
    order_index?: number;
  }
) {
  try {
    await sql`
      UPDATE normativity_documents
      SET
        title = ${data.title},
        category_key = ${data.category_key},
        file_name = CASE WHEN ${data.file_name !== undefined} THEN ${data.file_name} ELSE file_name END,
        file_base64 = CASE WHEN ${data.file_base64 !== undefined} THEN ${data.file_base64} ELSE file_base64 END,
        external_link = CASE WHEN ${data.external_link !== undefined} THEN ${data.external_link} ELSE external_link END,
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
  const auth = await assertActionPermission('students_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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
  const auth = await assertActionPermission('students_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    await sql`
      UPDATE students 
      SET rfid_tag_uid = NULL, tarjeta_numero = NULL
      WHERE id = ${studentId}::uuid
    `;
    return { success: true };
  } catch (error: any) {
    console.error('Error unlinking student tag:', error);
    return { error: error.message || 'Failed to unlink card' };
  }
}

export async function updateStudentDetails(
  studentId: string, 
  data: { 
    nombre?: string; 
    grado?: string; 
    documento?: string; 
    usuario_nro?: string;
    departamento?: string;
    sede?: number;
    telefono?: string;
    email?: string;
    domicilio?: string;
    tarjeta_numero?: string;
    rfid_tag_uid?: string;
    cumpleanos?: string;
    inicio_practicas?: string;
    activo?: boolean;
  }
) {
  const auth = await assertActionPermission('students_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const rawNombre = data.nombre?.trim();
    const nombre = rawNombre ? rawNombre.toUpperCase() : null;
    const nombreNormalizado = nombre
      ? nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9\s]/g, ' ').trim()
      : null;

    const grado = data.grado?.trim() || null;
    const rawDoc = data.documento !== undefined ? (data.documento.trim() || null) : undefined;
    const documento = rawDoc !== undefined ? rawDoc : undefined;
    const usuarioNro = data.usuario_nro !== undefined 
      ? (data.usuario_nro.trim() || null) 
      : (documento !== undefined ? documento : undefined);

    let departamento = data.departamento !== undefined ? (data.departamento.trim() || null) : undefined;
    if (grado && departamento === undefined) {
      const cfg = getAcademicGroupConfig(grado);
      if (cfg) {
        departamento = cfg.programName;
      } else if (grado.toUpperCase().includes('TAE') || grado.toUpperCase().includes('CB') || grado.toUpperCase().includes('ENFERM')) {
        departamento = 'Técnico Auxiliar en Enfermería (TAE)';
      } else if (grado.toUpperCase().includes('AIPI') || grado.toUpperCase().includes('INFANCIA')) {
        departamento = 'Atención Integral a la Primera Infancia (AIPI)';
      } else if (grado.toUpperCase().includes('PREESCOLAR')) {
        departamento = 'Técnico Auxiliar en Preescolar';
      }
    }

    const sede = data.sede !== undefined ? data.sede : undefined;
    const telefono = data.telefono !== undefined ? (data.telefono.trim() || null) : undefined;
    const email = data.email !== undefined ? (data.email.trim().toLowerCase() || null) : undefined;
    const domicilio = data.domicilio !== undefined ? (data.domicilio.trim() || null) : undefined;

    const rawTarjeta = data.tarjeta_numero !== undefined ? (data.tarjeta_numero.trim() || null) : undefined;
    const tarjetaNumero = rawTarjeta !== undefined 
      ? (rawTarjeta && !isNaN(Number(rawTarjeta)) ? Number(rawTarjeta) : null) 
      : undefined;

    const rawUid = data.rfid_tag_uid !== undefined ? (data.rfid_tag_uid.trim() || null) : undefined;
    const rfidTagUid = rawUid !== undefined 
      ? (rawUid ? rawUid.toUpperCase().replace(/[^A-F0-9]/g, '') : null) 
      : undefined;

    const cumpleanos = data.cumpleanos !== undefined ? (data.cumpleanos.trim() || null) : undefined;
    const inicioPracticas = data.inicio_practicas !== undefined ? (data.inicio_practicas.trim() || null) : undefined;
    const activo = data.activo !== undefined ? data.activo : true;

    // Asegurar columna email preventiva
    try {
      await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT`;
    } catch {}

    await sql`
      UPDATE students 
      SET 
        nombre = COALESCE(${nombre}, nombre),
        nombre_normalizado = CASE WHEN ${nombreNormalizado !== null} THEN ${nombreNormalizado} ELSE nombre_normalizado END,
        grado = COALESCE(${grado}, grado),
        documento = CASE WHEN ${documento !== undefined} THEN ${documento} ELSE documento END,
        usuario_nro = CASE WHEN ${usuarioNro !== undefined} THEN ${usuarioNro} ELSE usuario_nro END,
        departamento = CASE WHEN ${departamento !== undefined} THEN ${departamento} ELSE departamento END,
        sede = CASE WHEN ${sede !== undefined} THEN ${sede} ELSE sede END,
        telefono = CASE WHEN ${telefono !== undefined} THEN ${telefono} ELSE telefono END,
        email = CASE WHEN ${email !== undefined} THEN ${email} ELSE email END,
        domicilio = CASE WHEN ${domicilio !== undefined} THEN ${domicilio} ELSE domicilio END,
        tarjeta_numero = CASE WHEN ${tarjetaNumero !== undefined} THEN ${tarjetaNumero} ELSE tarjeta_numero END,
        rfid_tag_uid = CASE WHEN ${rfidTagUid !== undefined} THEN ${rfidTagUid} ELSE rfid_tag_uid END,
        cumpleanos = CASE WHEN ${cumpleanos !== undefined} THEN ${cumpleanos ? cumpleanos : null}::date ELSE cumpleanos END,
        inicio_practicas = CASE WHEN ${inicioPracticas !== undefined} THEN ${inicioPracticas ? inicioPracticas : null}::date ELSE inicio_practicas END,
        activo = ${activo}
      WHERE id = ${studentId}::uuid
    `;

    if (rfidTagUid) {
      try {
        await sql`
          UPDATE attendance_events
          SET student_id = ${studentId}::uuid
          WHERE (rfid_tag_uid = ${rfidTagUid} OR rfid_tag_uid ILIKE ${rfidTagUid})
            AND student_id IS NULL
        `;
      } catch (err) {
        console.warn('Could not backfill attendance_events for student card:', err);
      }
    }

    if (grado) {
      const normalized = normalizeGroupName(grado);
      const targetGroup = await sql`
        SELECT id FROM groups 
        WHERE UPPER(TRIM(nombre)) = ${normalized.toUpperCase()} 
           OR UPPER(TRIM(nombre)) = ${grado.toUpperCase()}
        LIMIT 1
      `;
      if (targetGroup.length > 0) {
        const gId = targetGroup[0].id;
        await sql`
          UPDATE enrollments 
          SET activo = FALSE, fecha_fin = CURRENT_DATE 
          WHERE student_id = ${studentId}::uuid AND group_id != ${gId}::uuid
        `;
        await sql`
          INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
          VALUES (gen_random_uuid(), ${studentId}::uuid, ${gId}::uuid, TRUE, CURRENT_DATE, NOW())
          ON CONFLICT (student_id, group_id) DO UPDATE 
          SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
        `;
      }
    }

    revalidatePath('/admin/attendance/enrollment');
    revalidatePath('/admin/attendance');
    revalidatePath('/admin/attendance/promotion');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating student details:', error);
    return { error: error.message || 'Error al actualizar estudiante' };
  }
}

export async function createStudent(data: { 
  nombre: string; 
  grado: string; 
  documento?: string;
  usuario_nro?: string;
  departamento?: string;
  sede?: number;
  telefono?: string;
  email?: string;
  domicilio?: string;
  tarjeta_numero?: string;
  rfid_tag_uid?: string;
  cumpleanos?: string;
  inicio_practicas?: string;
  activo?: boolean;
}) {
  const auth = await assertActionPermission('students_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const rawNombre = data.nombre.trim();
    if (!rawNombre) {
      return { error: 'El nombre completo del estudiante es obligatorio' };
    }
    const nombre = rawNombre.toUpperCase();
    const nombreNormalizado = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\s]/g, ' ')
      .trim();

    const grado = data.grado.trim();
    if (!grado) {
      return { error: 'El curso/grado oficial es obligatorio' };
    }

    const rawDoc = data.documento?.trim() || null;
    const documento = rawDoc;
    const usuarioNro = data.usuario_nro?.trim() || documento;

    let departamento = data.departamento?.trim() || null;
    if (!departamento) {
      const cfg = getAcademicGroupConfig(grado);
      if (cfg) {
        departamento = cfg.programName;
      } else if (grado.toUpperCase().includes('TAE') || grado.toUpperCase().includes('CB') || grado.toUpperCase().includes('ENFERM')) {
        departamento = 'Técnico Auxiliar en Enfermería (TAE)';
      } else if (grado.toUpperCase().includes('AIPI') || grado.toUpperCase().includes('INFANCIA')) {
        departamento = 'Atención Integral a la Primera Infancia (AIPI)';
      } else if (grado.toUpperCase().includes('PREESCOLAR')) {
        departamento = 'Técnico Auxiliar en Preescolar';
      }
    }

    const sede = data.sede ?? 1;
    const telefono = data.telefono?.trim() || null;
    const email = data.email?.trim().toLowerCase() || null;
    const domicilio = data.domicilio?.trim() || null;

    const rawTarjeta = data.tarjeta_numero?.trim() || null;
    const tarjetaNumero = rawTarjeta && !isNaN(Number(rawTarjeta)) ? Number(rawTarjeta) : null;

    const rawUid = data.rfid_tag_uid?.trim() || null;
    const rfidTagUid = rawUid ? rawUid.toUpperCase().replace(/[^A-F0-9]/g, '') : null;

    const cumpleanos = data.cumpleanos?.trim() || null;
    const inicioPracticas = data.inicio_practicas?.trim() || null;
    const activo = data.activo ?? true;

    // Asegurar columna email si aún no existe
    try {
      await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT`;
    } catch {}

    const res = await sql`
      INSERT INTO students (
        id, nombre, nombre_normalizado, documento, usuario_nro, grado, departamento,
        tarjeta_numero, rfid_tag_uid, telefono, email, domicilio, sede, rol, activo,
        cumpleanos, inicio_practicas, created_at
      )
      VALUES (
        gen_random_uuid(), ${nombre}, ${nombreNormalizado}, ${documento}, ${usuarioNro}, ${grado}, ${departamento},
        ${tarjetaNumero}, ${rfidTagUid}, ${telefono}, ${email}, ${domicilio}, ${sede}, 'Estudiante', ${activo},
        ${cumpleanos ? cumpleanos : null}::date,
        ${inicioPracticas ? inicioPracticas : null}::date,
        NOW()
      )
      RETURNING id
    `;
    const studentId = res[0]?.id;

    if (studentId && grado) {
      const normalized = normalizeGroupName(grado);
      const targetGroup = await sql`
        SELECT id FROM groups 
        WHERE UPPER(TRIM(nombre)) = ${normalized.toUpperCase()} 
           OR UPPER(TRIM(nombre)) = ${grado.toUpperCase()}
        LIMIT 1
      `;
      if (targetGroup.length > 0) {
        const gId = targetGroup[0].id;
        await sql`
          INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
          VALUES (gen_random_uuid(), ${studentId}::uuid, ${gId}::uuid, TRUE, CURRENT_DATE, NOW())
          ON CONFLICT (student_id, group_id) DO UPDATE 
          SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
        `;
      }
    }

    revalidatePath('/admin/attendance/enrollment');
    revalidatePath('/admin/attendance');
    revalidatePath('/admin/attendance/promotion');
    return { success: true, studentId };
  } catch (error: any) {
    console.error('Error creating student:', error);
    return { error: error.message || 'Error al crear estudiante' };
  }
}

export async function ensureStudentEnrollment(studentId: string) {
  const auth = await assertActionPermission('students_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const stRes = await sql`SELECT id, grado FROM students WHERE id = ${studentId}::uuid LIMIT 1`;
    if (stRes.length === 0) return { error: 'Estudiante no encontrado' };

    const { grado } = stRes[0];
    if (!grado) return { error: 'El estudiante no tiene curso asignado' };

    const normalized = normalizeGroupName(grado);
    const targetGroup = await sql`
      SELECT id, nombre FROM groups 
      WHERE UPPER(TRIM(nombre)) = ${normalized.toUpperCase()} 
         OR UPPER(TRIM(nombre)) = ${grado.toUpperCase()}
      LIMIT 1
    `;

    if (targetGroup.length === 0) {
      return { error: `No se encontró un grupo oficial para el curso "${grado}"` };
    }

    const gId = targetGroup[0].id;
    await sql`
      UPDATE enrollments 
      SET activo = FALSE, fecha_fin = CURRENT_DATE 
      WHERE student_id = ${studentId}::uuid AND group_id != ${gId}::uuid
    `;
    await sql`
      INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
      VALUES (gen_random_uuid(), ${studentId}::uuid, ${gId}::uuid, TRUE, CURRENT_DATE, NOW())
      ON CONFLICT (student_id, group_id) DO UPDATE 
      SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
    `;

    revalidatePath('/admin/attendance/enrollment');
    return { success: true, groupName: targetGroup[0].nombre };
  } catch (error: any) {
    console.error('Error ensuring student enrollment:', error);
    return { error: error.message || 'Error al matricular estudiante' };
  }
}

export async function bulkUpdateStudentGrado(studentIds: string[], newGrado: string) {
  const auth = await assertActionPermission('students_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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

    if (trimmedGrado) {
      const normalized = normalizeGroupName(trimmedGrado);
      const targetGroup = await sql`
        SELECT id FROM groups 
        WHERE UPPER(TRIM(nombre)) = ${normalized.toUpperCase()} 
           OR UPPER(TRIM(nombre)) = ${trimmedGrado.toUpperCase()}
        LIMIT 1
      `;
      if (targetGroup.length > 0) {
        const gId = targetGroup[0].id;
        for (const sId of studentIds) {
          await sql`
            UPDATE enrollments 
            SET activo = FALSE, fecha_fin = CURRENT_DATE 
            WHERE student_id = ${sId}::uuid AND group_id != ${gId}::uuid
          `;
          await sql`
            INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
            VALUES (gen_random_uuid(), ${sId}::uuid, ${gId}::uuid, TRUE, CURRENT_DATE, NOW())
            ON CONFLICT (student_id, group_id) DO UPDATE 
            SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
          `;
        }
      }
    }

    return { success: true, count: studentIds.length };
  } catch (error: any) {
    console.error('Error bulk updating student grado:', error);
    return { error: error.message || 'Error al actualizar grados en lote' };
  }
}

export async function deleteStudent(studentId: string) {
  const auth = await assertActionPermission('students_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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
  const auth = await assertActionPermission('attendance_edit');
  if (!auth.authorized) {
    return { error: auth.error };
  }
  try {
    if (!studentId) {
      return { error: 'ID de estudiante no proporcionado' };
    }

    let student: any = null;

    const studentRes = await sql`
      SELECT s.id, s.nombre, s.rfid_tag_uid, s.activo 
      FROM students s 
      WHERE s.id = ${studentId}::uuid 
      LIMIT 1
    `;

    if (studentRes.length > 0) {
      const row = studentRes[0];
      student = {
        id: row.id,
        student_id: row.id,
        nombre: row.nombre,
        rfid_tag_uid: row.rfid_tag_uid,
        activo: Boolean(row.activo)
      };
    } else {
      const normRes = await sql`
        SELECT sn.id, COALESCE(sn.nombre_original, sn.nombre_normalizado) as nombre, sn.rfid_tag_uid, sn.estado as norm_estado
        FROM students_normalized sn
        WHERE sn.id = ${studentId}::uuid
        LIMIT 1
      `;
      if (normRes.length > 0) {
        const row = normRes[0];
        student = {
          id: row.id,
          student_id: row.id,
          nombre: row.nombre,
          rfid_tag_uid: row.rfid_tag_uid,
          activo: row.norm_estado === 'ACTIVO' || row.norm_estado == null
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
      SELECT s.nombre, sn.nombre_original 
      FROM students s 
      LEFT JOIN students_normalized sn ON sn.id = s.id
      WHERE s.id = ${studentId}::uuid OR sn.id = ${studentId}::uuid
      LIMIT 1
    `;
    const sessInfo = await sql`SELECT fecha FROM class_sessions WHERE id = ${sessionId}::uuid LIMIT 1`;
    const stName = stInfo[0]?.nombre || stInfo[0]?.nombre_original || studentId;
    const sessDate = sessInfo[0]?.fecha ? new Date(sessInfo[0].fecha).toISOString().split('T')[0] : sessionId;

    const isExcusa = cleanEstado.startsWith('EXCUSA');
    const excusaDesc = cleanEstado === 'EXCUSA_PRACTICAS_AIPI' 
      ? 'Cargó excusa de prácticas AIPI' 
      : cleanEstado === 'EXCUSA_MEDICA' 
      ? 'Cargó excusa médica' 
      : 'Modificó asistencia';

    await logAuditEvent({
      action: isExcusa ? 'EXCUSA_REGISTRADA' : 'ASISTENCIA_MODIFICADA',
      category: 'ATTENDANCE',
      details: `${excusaDesc} para ${stName} (Fecha ${sessDate}) a [${cleanEstado}]${cleanObs ? `: "${cleanObs}"` : ''}`,
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
    const cleanInput = email.trim().toLowerCase();
    let teacherId = '';
    let teacherNombre = '';
    let passwordMatch = false;

    // 1. Buscar en teachers
    const teachers = await sql`
      SELECT id, nombre, email, password_hash 
      FROM teachers 
      WHERE LOWER(email) = ${cleanInput} 
      LIMIT 1
    `;
    if (teachers.length > 0 && teachers[0].password_hash) {
      passwordMatch = await bcrypt.compare(password, teachers[0].password_hash);
      if (passwordMatch) {
        teacherId = teachers[0].id;
        teacherNombre = teachers[0].nombre || email;
      }
    }

    // 2. Si no coincide, buscar en admin_users
    if (!passwordMatch) {
      const adminUsers = await sql`
        SELECT id, nombre, email, password_hash, role, activo 
        FROM admin_users 
        WHERE LOWER(email) = ${cleanInput} 
        LIMIT 1
      `;
      if (adminUsers.length > 0 && adminUsers[0].password_hash && adminUsers[0].activo !== false) {
        passwordMatch = await bcrypt.compare(password, adminUsers[0].password_hash);
        if (passwordMatch) {
          teacherId = adminUsers[0].id;
          teacherNombre = adminUsers[0].nombre || email;
        }
      }
    }

    if (!passwordMatch || !teacherId) {
      return { error: 'Credenciales inválidas' };
    }

    // Provisionar lector móvil si no existe
    const readerId = `movil-${teacherId.slice(0, 8)}`;
    await sql`
      INSERT INTO readers (id, ubicacion, tipo, teacher_id, sede)
      VALUES (${readerId}, ${`Lector Móvil - ${teacherNombre}`}, 'mobile_nfc', ${teacherId}::uuid, 'Sede 1')
      ON CONFLICT (id) DO UPDATE SET teacher_id = ${teacherId}::uuid
    `;

    // Create session
    const sessionToken = await encrypt({ 
      teacherId, 
      email: cleanInput, 
      nombre: teacherNombre, 
      role: 'teacher' 
    });
    
    (await cookies()).set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
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
  const auth = await assertActionPermission('documents_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const studentNombre = data.student_nombre.trim();
    const tipoDocumento = data.tipo_documento.trim();
    const programaCurso = data.programa_curso.trim();
    let consecutivo = data.consecutivo?.trim();

    if (!studentNombre || !tipoDocumento || !programaCurso) {
      return { error: 'Nombre, Tipo de Documento y Programa son obligatorios' };
    }

    // Seguridad: Diplomas y Actas de Grado solo pueden ser expedidos por admin@fundacionsanmateo.edu.co
    const isDiplomaOrActa = /diploma|acta/i.test(tipoDocumento);
    if (isDiplomaOrActa) {
      const { isAdmin } = await checkIsAdminFull();
      if (!isAdmin) {
        return { 
          error: 'Permiso denegado: Solo el usuario admin@fundacionsanmateo.edu.co tiene autorización para expedir Diplomas y Actas de Grado.' 
        };
      }
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

export async function bulkCreateIssuedDocuments(items: Array<{
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
}>) {
  const auth = await assertActionPermission('documents_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    if (!Array.isArray(items) || items.length === 0) {
      return { error: 'No se recibieron registros para importar.' };
    }

    // Seguridad: Diplomas y Actas de Grado solo pueden ser importados por admin@fundacionsanmateo.edu.co
    const hasDiplomaOrActa = items.some(it => /diploma|acta/i.test(it.tipo_documento || ''));
    if (hasDiplomaOrActa) {
      const { isAdmin } = await checkIsAdminFull();
      if (!isAdmin) {
        return { 
          error: 'Permiso denegado: El archivo contiene Diplomas o Actas de Grado. Solo el usuario admin@fundacionsanmateo.edu.co tiene autorización para expedir Diplomas y Actas.' 
        };
      }
    }

    const year = new Date().getFullYear();
    // Get last consecutivo number for base
    const lastResult = await sql`
      SELECT consecutivo 
      FROM issued_documents 
      WHERE consecutivo LIKE ${`FSM-${year}-%`} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    let currentNum = 0;
    if (lastResult.length > 0) {
      const parts = lastResult[0].consecutivo.split('-');
      const parsed = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsed)) currentNum = parsed;
    }

    const createdList: string[] = [];
    let successCount = 0;
    let errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const studentNombre = item.student_nombre?.trim();
      const tipoDocumento = item.tipo_documento?.trim() || 'Diploma de Grado';
      const programaCurso = item.programa_curso?.trim() || 'PROGRAMA GENERAL';

      if (!studentNombre) {
        errors.push(`Fila ${i + 1}: El nombre del estudiante es obligatorio.`);
        continue;
      }

      let consecutivo = item.consecutivo?.trim();
      if (!consecutivo) {
        currentNum++;
        consecutivo = `FSM-${year}-${String(currentNum).padStart(5, '0')}`;
      }

      const studentDocumento = item.student_documento?.trim() || null;
      
      // Parse fecha expedicion
      let fechaExpedicion = item.fecha_expedicion?.trim() || new Date().toISOString().split('T')[0];
      if (fechaExpedicion.includes('/')) {
        const dParts = fechaExpedicion.split('/');
        if (dParts.length === 3) {
          // DD/MM/YYYY to YYYY-MM-DD
          fechaExpedicion = `${dParts[2]}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
        }
      }

      const folio = item.folio?.trim() || null;
      const libro = item.libro?.trim() || null;
      const notas = item.notas?.trim() || null;
      const pdfUrl = item.pdf_url?.trim() || null;

      try {
        await sql`
          INSERT INTO issued_documents (
            consecutivo, student_nombre, student_documento, tipo_documento,
            programa_curso, fecha_expedicion, folio, libro, estado, notas, pdf_url
          ) VALUES (
            ${consecutivo}, ${studentNombre}, ${studentDocumento}, ${tipoDocumento},
            ${programaCurso}, ${fechaExpedicion}::date, ${folio}, ${libro}, 'valido', ${notas}, ${pdfUrl}
          )
        `;
        createdList.push(consecutivo);
        successCount++;
      } catch (err: any) {
        console.error(`Error inserting row ${i + 1}:`, err);
        if (err.message?.includes('unique') || err.message?.includes('duplicate key')) {
          errors.push(`Fila ${i + 1}: Consecutivo "${consecutivo}" ya registrado.`);
        } else {
          errors.push(`Fila ${i + 1} (${studentNombre}): ${err.message || 'Error al guardar'}`);
        }
      }
    }

    if (successCount > 0) {
      await logAuditEvent({
        action: 'DOCUMENT_BULK_IMPORTED',
        category: 'CONTENT',
        details: `Carga masiva completada: ${successCount} documentos oficiales expedidos`,
        metadata: {
          total_imported: successCount,
          errors_count: errors.length,
          first_consecutivo: createdList[0],
          last_consecutivo: createdList[createdList.length - 1]
        }
      });
    }

    return {
      success: successCount > 0,
      count: successCount,
      errors: errors.slice(0, 10),
      createdList
    };
  } catch (error: any) {
    console.error('Error in bulkCreateIssuedDocuments:', error);
    return { error: error.message || 'Error al procesar la carga masiva de documentos' };
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
  const auth = await assertActionPermission('documents_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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
    const hasPdfUrlKey = 'pdf_url' in data;
    const pdfUrl = (data.pdf_url && data.pdf_url.trim()) || null;

    const currentDoc = await sql`SELECT tipo_documento, estado FROM issued_documents WHERE id = ${id}::uuid LIMIT 1`;
    if (currentDoc.length > 0) {
      const isCurrentDiplomaOrActa = /diploma|acta/i.test(currentDoc[0].tipo_documento || '');
      const isNewDiplomaOrActa = tipoDocumento && /diploma|acta/i.test(tipoDocumento);
      const isAnnulling = estado === 'anulado' && currentDoc[0].estado !== 'anulado';

      if (isCurrentDiplomaOrActa || isNewDiplomaOrActa) {
        const { isAdmin } = await checkIsAdminFull();
        if (!isAdmin) {
          return { error: 'Permiso denegado: Solo el usuario admin@fundacionsanmateo.edu.co puede modificar o anular Diplomas y Actas de Grado.' };
        }
      } else if (isAnnulling) {
        const { isAdmin } = await checkIsAdminFull();
        if (!isAdmin) {
          return { error: 'Permiso denegado: Solo el usuario admin@fundacionsanmateo.edu.co tiene autorización para anular documentos.' };
        }
      }
    }

    if (hasPdfUrlKey) {
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
          pdf_url = ${pdfUrl},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}::uuid
      `;
    } else {
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
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}::uuid
      `;
    }

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
  const auth = await assertActionPermission('documents_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const existing = await sql`SELECT consecutivo, student_nombre, tipo_documento FROM issued_documents WHERE id = ${id}::uuid LIMIT 1`;
    const docInfo = existing.length > 0 ? existing[0] : null;
    const isDiplomaOrActa = /diploma|acta/i.test(docInfo?.tipo_documento || '');

    // Seguridad: Solo admin@fundacionsanmateo.edu.co puede anular diplomas y actas (o anular documentos)
    if (isDiplomaOrActa || newEstado === 'anulado') {
      const { isAdmin } = await checkIsAdminFull();
      if (!isAdmin) {
        return { 
          error: 'Permiso denegado: Solo el usuario admin@fundacionsanmateo.edu.co tiene autorización para anular o cambiar el estado de este documento.' 
        };
      }
    }

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
  const auth = await assertActionPermission('documents_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }
  try {
    const existing = await sql`SELECT consecutivo, student_nombre, tipo_documento FROM issued_documents WHERE id = ${id}::uuid LIMIT 1`;
    const docInfo = existing.length > 0 ? existing[0] : null;
    const isDiplomaOrActa = /diploma|acta/i.test(docInfo?.tipo_documento || '');

    // Seguridad: Solo admin@fundacionsanmateo.edu.co puede eliminar Diplomas y Actas
    if (isDiplomaOrActa) {
      const { isAdmin } = await checkIsAdminFull();
      if (!isAdmin) {
        return { 
          error: 'Permiso denegado: Solo el usuario admin@fundacionsanmateo.edu.co tiene autorización para eliminar Diplomas y Actas de Grado.' 
        };
      }
    }

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

    // Check if targetDate is an official Colombian holiday
    const holidayInfo = isColombiaHoliday(dateStr);
    if (holidayInfo.isHoliday) {
      return {
        success: true,
        date: dateStr,
        totalScansOnDate: totalScans,
        dayOfWeek,
        isWeekday,
        isSaturday,
        isSunday,
        isFutureOrZeroScan: true,
        isHoliday: true,
        holidayName: holidayInfo.holidayName,
        activeCoursesScanned: [],
        absentStudents: []
      };
    }

    // Fetch active students without attendance events or override excuse on targetDate
    const rows = await sql`
      SELECT 
        s.id as student_id,
        s.nombre,
        COALESCE(g.nombre, s.grado) as grado,
        s.telefono,
        s.rfid_tag_uid,
        COALESCE(g.jornada, 
          CASE 
            WHEN UPPER(COALESCE(g.nombre, s.grado)) LIKE '%NOCHE%' THEN 'NOCHE'
            WHEN UPPER(COALESCE(g.nombre, s.grado)) LIKE '%SABADO%' OR UPPER(COALESCE(g.nombre, s.grado)) LIKE '%SB%' THEN 'SABADO'
            ELSE 'DIURNO'
          END
        ) as turno_calculado,
        g.tipo as group_tipo,
        e.fecha_inicio as enrollment_fecha_inicio,
        ae.id as event_id,
        ae.timestamp::text as hora_entrada,
        af.id as followup_id,
        af.se_llamo,
        af.estado_llamada,
        af.comentarios,
        af.excusa_url,
        af.registrado_por,
        af.updated_at::text as fecha_seguimiento,
        ar.estado as record_estado,
        ar.observaciones as record_observaciones
      FROM students s
      LEFT JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
      LEFT JOIN groups g ON g.id = e.group_id
      LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
      LEFT JOIN absence_followups af ON s.id = af.student_id AND af.fecha = ${dateStr}::date
      LEFT JOIN class_sessions cs ON cs.group_id = g.id AND cs.fecha = ${dateStr}::date
      LEFT JOIN attendance_records_normalized ar ON ar.session_id = cs.id AND ar.student_id = s.id
      WHERE s.activo = TRUE
        AND ae.id IS NULL
        AND (ar.estado IS NULL OR ar.estado = 'AUSENTE')
      ORDER BY turno_calculado, grado, s.nombre
    `;

    // Strict day-of-week shift applicability & Calendario B exclusion:
    // 1. Calendario B (CB) students do NOT start classes until September.
    // 2. Weekdays (Mon-Fri): Only DIURNO and NOCHE students have class. SABADO students do NOT have class.
    // 3. Saturdays: Only SABADO students have class. DIURNO and NOCHE students do NOT have class.
    // 4. Sundays: No students have class.
    const isBeforeSept = dateStr < '2026-09-01';
    const validRows = rows.filter((r: any) => {
      const isCB = (r.grado && r.grado.toUpperCase().includes('CB')) || (r.group_tipo && r.group_tipo.toUpperCase().includes('CALENDARIO_B'));
      if (isBeforeSept && isCB) {
        return false; // Calendario B starts in September
      }
      // Pre-enrollment date exclusion
      if (r.enrollment_fecha_inicio) {
        const enrollDate = typeof r.enrollment_fecha_inicio === 'string' 
          ? r.enrollment_fecha_inicio.split('T')[0] 
          : new Date(r.enrollment_fecha_inicio).toISOString().split('T')[0];
        if (dateStr < enrollDate) {
          return false;
        }
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
      SELECT DISTINCT COALESCE(g.nombre, s.grado) as grado
      FROM attendance_events ae
      JOIN students s ON ae.student_id = s.id
      LEFT JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
      LEFT JOIN groups g ON g.id = e.group_id
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
      SELECT s.nombre, sn.nombre_original 
      FROM students s
      LEFT JOIN students_normalized sn ON sn.id = s.id
      WHERE s.id = ${data.studentId}::uuid OR sn.id = ${data.studentId}::uuid
      LIMIT 1
    `;
    const stName = stInfo[0]?.nombre || stInfo[0]?.nombre_original || data.studentId;

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
  const auth = await assertActionPermission('users_manage');
  if (!auth.authorized) {
    return [];
  }

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
  const auth = await assertActionPermission('users_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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
  const auth = await assertActionPermission('users_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

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
  const activoStr = formData.get('activo') as string;
  const activo = activoStr !== null && activoStr !== undefined ? activoStr === 'true' : true;

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
          permissions = ${JSON.stringify(permissions)}::jsonb,
          activo = ${activo}
        WHERE id = ${userId}::uuid
      `;
    } else {
      await sql`
        UPDATE admin_users
        SET 
          nombre = ${nombre},
          email = ${email},
          role = ${role},
          permissions = ${JSON.stringify(permissions)}::jsonb,
          activo = ${activo}
        WHERE id = ${userId}::uuid
      `;
    }

    if ((role === 'teacher' || permissions.includes('mobile_attendance')) && activo) {
      await sql`
        INSERT INTO teachers (id, nombre, email, password_hash)
        SELECT 
          id, 
          ${nombre}, 
          ${email}, 
          COALESCE(password_hash, '')
        FROM admin_users
        WHERE id = ${userId}::uuid
        ON CONFLICT (id) DO UPDATE SET 
          nombre = EXCLUDED.nombre, 
          email = EXCLUDED.email,
          password_hash = CASE 
            WHEN EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash 
            ELSE teachers.password_hash 
          END
      `;
      const readerId = `movil-${userId.slice(0, 8)}`;
      await sql`
        INSERT INTO readers (id, ubicacion, tipo, teacher_id, sede)
        VALUES (${readerId}, ${`Lector Móvil - ${nombre}`}, 'mobile_nfc', ${userId}::uuid, 'Sede 1')
        ON CONFLICT (id) DO UPDATE SET teacher_id = ${userId}::uuid, ubicacion = ${`Lector Móvil - ${nombre}`}
      `;
    } else {
      // Si el rol ya no es docente o el usuario está inactivo, revocar acceso en teachers y lectores móviles
      await sql`
        DELETE FROM teachers 
        WHERE id = ${userId}::uuid
      `;
      await sql`
        DELETE FROM readers 
        WHERE teacher_id = ${userId}::uuid AND tipo = 'mobile_nfc'
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
  const auth = await assertActionPermission('users_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    await sql`
      UPDATE admin_users
      SET activo = ${newStatus}
      WHERE id = ${userId}::uuid
    `;

    if (!newStatus) {
      // Al desactivar cuenta, revocar en teachers y lectores móviles
      await sql`DELETE FROM teachers WHERE id = ${userId}::uuid`;
      await sql`DELETE FROM readers WHERE teacher_id = ${userId}::uuid AND tipo = 'mobile_nfc'`;
    } else {
      // Al reactivar cuenta, restaurar en teachers si corresponde a rol docente
      const u = await sql`SELECT role, permissions, nombre, email, password_hash FROM admin_users WHERE id = ${userId}::uuid LIMIT 1`;
      if (u.length > 0) {
        const role = u[0].role;
        const permissions = Array.isArray(u[0].permissions) ? u[0].permissions : [];
        if (role === 'teacher' || permissions.includes('mobile_attendance')) {
          await sql`
            INSERT INTO teachers (id, nombre, email, password_hash)
            VALUES (${userId}::uuid, ${u[0].nombre}, ${u[0].email}, ${u[0].password_hash})
            ON CONFLICT (id) DO UPDATE SET 
              nombre = EXCLUDED.nombre, 
              email = EXCLUDED.email, 
              password_hash = EXCLUDED.password_hash
          `;
          const readerId = `movil-${userId.slice(0, 8)}`;
          await sql`
            INSERT INTO readers (id, ubicacion, tipo, teacher_id, sede)
            VALUES (${readerId}, ${`Lector Móvil - ${u[0].nombre}`}, 'mobile_nfc', ${userId}::uuid, 'Sede 1')
            ON CONFLICT (id) DO UPDATE SET 
              teacher_id = ${userId}::uuid, 
              ubicacion = ${`Lector Móvil - ${u[0].nombre}`}
          `;
        }
      }
    }

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
  const auth = await assertActionPermission('users_manage');
  if (!auth.authorized) {
    return { error: auth.error };
  }
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
  const auth = await assertActionPermission('attendance_edit');
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    if (!studentId || !sessionId || !estado) {
      return { error: 'Parámetros incompletos' };
    }

    const cleanEstado = estado.trim().toUpperCase();
    const cleanObs = observaciones?.trim() || null;

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
      SELECT s.nombre, sn.nombre_original 
      FROM students s
      LEFT JOIN students_normalized sn ON sn.id = s.id
      WHERE s.id = ${studentId}::uuid OR sn.id = ${studentId}::uuid
      LIMIT 1
    `;
    const sessInfo = await sql`
      SELECT cs.fecha, g.nombre as grupo_nombre
      FROM class_sessions cs
      LEFT JOIN groups g ON g.id = cs.group_id
      WHERE cs.id = ${sessionId}::uuid
      LIMIT 1
    `;

    const stName = stInfo[0]?.nombre || stInfo[0]?.nombre_original || studentId;
    const sessDate = sessInfo[0]?.fecha ? new Date(sessInfo[0].fecha).toISOString().split('T')[0] : sessionId;
    const grpName = sessInfo[0]?.grupo_nombre || '';

    const isExcusa = cleanEstado.startsWith('EXCUSA');
    const excusaDesc = cleanEstado === 'EXCUSA_PRACTICAS_AIPI' 
      ? 'Registró excusa de prácticas AIPI' 
      : cleanEstado === 'EXCUSA_MEDICA' 
      ? 'Registró excusa médica' 
      : 'Modificó asistencia';

    await logAuditEvent({
      action: isExcusa ? 'EXCUSA_REGISTRADA' : 'ASISTENCIA_MODIFICADA',
      category: 'ATTENDANCE',
      details: `${excusaDesc} para ${stName} ${grpName ? `(${grpName})` : ''} en fecha ${sessDate} a estado [${cleanEstado}]${cleanObs ? ` (Obs: "${cleanObs}")` : ''}`,
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
      FROM students s
      JOIN enrollments e ON e.student_id = s.id
      WHERE e.group_id = ${groupId}::uuid
        AND (e.activo IS NULL OR e.activo = TRUE)
        AND (s.activo IS NULL OR s.activo = TRUE)
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
 * Sincroniza o genera las sesiones de clase faltantes para un grupo (ej. septiembre a diciembre).
 * Toma las fechas de referencia oficiales del calendario del colegio según la jornada (lunes a viernes o sábados).
 */
export async function syncGroupSessionsAction(groupId: string) {
  try {
    if (!groupId) return { error: 'ID de grupo requerido' };

    const { isAdmin } = await checkIsAdminFull();
    if (!isAdmin) {
      return { error: 'Permiso denegado: Operación reservada para administradores.' };
    }

    const grpInfo = await sql`SELECT id, nombre, jornada FROM groups WHERE id = ${groupId}::uuid LIMIT 1`;
    if (grpInfo.length === 0) return { error: 'Grupo no encontrado' };
    const grp = grpInfo[0];

    const isSaturday = grp.jornada === 'SABADO' || grp.nombre.toUpperCase().includes('SABADO');

    let refDates: { fecha: string; dia_semana_texto: string }[] = [];
    if (isSaturday) {
      refDates = await sql`
        SELECT DISTINCT fecha::text as fecha, dia_semana_texto
        FROM class_sessions
        WHERE group_id IN (SELECT id FROM groups WHERE nombre IN ('I SABADO A', 'II SABADO A', 'III SABADO A'))
        ORDER BY fecha ASC
      `;
    } else {
      refDates = await sql`
        SELECT DISTINCT fecha::text as fecha, dia_semana_texto
        FROM class_sessions
        WHERE group_id IN (SELECT id FROM groups WHERE nombre IN ('I DIURNO A', 'II DIURNO A', 'II DIURNO A CB'))
        ORDER BY fecha ASC
      `;
    }

    if (refDates.length === 0) {
      const diasNombres = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
      const start = new Date('2026-09-01T12:00:00Z');
      const end = new Date('2026-12-15T12:00:00Z');
      const daysToInclude = isSaturday ? [6] : [1, 2, 3, 4, 5];
      const curr = new Date(start);
      while (curr <= end) {
        const dayOfWeek = curr.getUTCDay();
        if (daysToInclude.includes(dayOfWeek)) {
          refDates.push({
            fecha: curr.toISOString().split('T')[0],
            dia_semana_texto: diasNombres[dayOfWeek]
          });
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }

    let addedCount = 0;
    for (const d of refDates) {
      const exists = await sql`
        SELECT id FROM class_sessions 
        WHERE group_id = ${groupId}::uuid AND fecha = ${d.fecha}::date 
        LIMIT 1
      `;
      if (exists.length === 0) {
        await sql`
          INSERT INTO class_sessions (id, group_id, fecha, dia_semana_texto, dia_semana_calculado, activa, created_at)
          VALUES (gen_random_uuid(), ${groupId}::uuid, ${d.fecha}::date, ${d.dia_semana_texto}, ${d.dia_semana_texto}, TRUE, NOW())
        `;
        addedCount++;
      }
    }

    await logAuditEvent({
      action: 'GENERAR_SESIONES_CALENDARIO',
      category: 'COURSES',
      details: `Generó ${addedCount} sesiones de clase oficiales para el grupo ${grp.nombre}.`,
      metadata: { groupId, grupo: grp.nombre, addedCount }
    });

    revalidatePath(`/admin/attendance/group/${groupId}`);
    revalidatePath('/admin/attendance');
    return { success: true, addedCount, totalRef: refDates.length };
  } catch (error: any) {
    console.error('Error syncing group sessions:', error);
    return { error: error?.message || 'Error al generar sesiones del calendario' };
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

/**
 * Obtiene los estudiantes de un grupo con su balance de asistencia y la sugerencia del siguiente semestre
 */
export async function getGroupStudentsForPromotion(groupId: string) {
  try {
    const groupRes = await sql`
      SELECT id, nombre, jornada, tipo
      FROM groups
      WHERE id = ${groupId}::uuid
      LIMIT 1
    `;
    if (groupRes.length === 0) {
      return { error: 'Grupo no encontrado' };
    }
    const group = groupRes[0];

    // Estudiantes matriculados activos en este grupo
    const students = await sql`
      SELECT 
        s.id, 
        s.nombre, 
        s.documento, 
        s.tarjeta_numero, 
        s.rfid_tag_uid, 
        s.grado, 
        s.activo,
        e.id as enrollment_id,
        COALESCE(SUM(CASE WHEN ar.estado = 'PRESENTE' THEN 1 ELSE 0 END), 0)::int as presentes,
        COALESCE(SUM(CASE WHEN ar.estado = 'AUSENTE' THEN 1 ELSE 0 END), 0)::int as ausentes,
        COALESCE(SUM(CASE WHEN ar.estado = 'EXCUSA' THEN 1 ELSE 0 END), 0)::int as excusas,
        COUNT(ar.id)::int as total_registros
      FROM students s
      JOIN enrollments e ON e.student_id = s.id
      LEFT JOIN attendance_records_normalized ar ON ar.student_id = s.id
      LEFT JOIN class_sessions cs ON cs.id = ar.session_id AND cs.group_id = ${groupId}::uuid
      WHERE e.group_id = ${groupId}::uuid
        AND (e.activo IS NULL OR e.activo = TRUE)
      GROUP BY s.id, s.nombre, s.documento, s.tarjeta_numero, s.rfid_tag_uid, s.grado, s.activo, e.id
      ORDER BY s.nombre ASC
    `;

    // Buscar grupo sucesor sugerido según catálogo institucional
    const allGroups = await sql`
      SELECT g.id, g.nombre, g.jornada, g.tipo, g.programa_codigo, g.programa_nombre, g.semestre_romano, g.modalidad,
             COUNT(e.id)::int as enrolled_count
      FROM groups g
      LEFT JOIN enrollments e ON e.group_id = g.id AND (e.activo IS NULL OR e.activo = TRUE)
      GROUP BY g.id, g.nombre, g.jornada, g.tipo, g.programa_codigo, g.programa_nombre, g.semestre_romano, g.modalidad
      ORDER BY g.programa_nombre ASC, g.semestre_romano ASC, g.nombre ASC
    `;
    let suggestedTargetGroup: any = null;
    const { nextGroupName, isFinalSemester } = getNextAcademicGroup(group.nombre);

    if (nextGroupName && nextGroupName !== 'EGRESADO') {
      suggestedTargetGroup = allGroups.find((g: any) => 
        g.nombre.toUpperCase().trim() === nextGroupName.toUpperCase().trim()
      );
    }

    return {
      success: true,
      group,
      students: students.map((s: any) => {
        const total = s.presentes + s.ausentes + s.excusas;
        const percentage = total > 0 ? Math.round((s.presentes / total) * 100) : 100;
        return {
          ...s,
          attendancePercentage: percentage
        };
      }),
      allGroups,
      suggestedTargetGroup: suggestedTargetGroup || null,
      isFinalSemester
    };
  } catch (error: any) {
    console.error('Error in getGroupStudentsForPromotion:', error);
    return { error: error?.message || 'Error al consultar datos del grupo' };
  }
}

export interface PromotionDecision {
  studentId: string;
  action: 'promote' | 'repeat' | 'withdraw' | 'transfer';
  customTargetGroupId?: string;
  customTargetGrado?: string;
}

/**
 * Ejecuta el cierre del periodo y la promoción, repitencia o retiro de los estudiantes
 */
export async function executeSemesterPromotion(
  sourceGroupId: string,
  targetGroupId: string | null,
  targetGrado: string | null,
  decisions: PromotionDecision[]
) {
  const auth = await assertActionPermission('students_manage');
  if (!auth.authorized || !auth.session) {
    return { error: auth.error };
  }

  try {
    const adminEmail = auth.session.email;
    const adminName = auth.session.email;

    const groupRes = await sql`SELECT id, nombre FROM groups WHERE id = ${sourceGroupId}::uuid LIMIT 1`;
    if (groupRes.length === 0) {
      return { error: 'Grupo origen no encontrado' };
    }
    const sourceGroupName = groupRes[0].nombre;

    let targetGroupName = targetGrado || '';
    let targetSessions: any[] = [];
    if (targetGroupId) {
      const tgRes = await sql`SELECT id, nombre FROM groups WHERE id = ${targetGroupId}::uuid LIMIT 1`;
      if (tgRes.length > 0) {
        targetGroupName = tgRes[0].nombre;
        targetSessions = await sql`SELECT id FROM class_sessions WHERE group_id = ${targetGroupId}::uuid`;
      }
    }

    let promotedCount = 0;
    let repeatedCount = 0;
    let withdrawnCount = 0;
    let transferredCount = 0;

    for (const d of decisions) {
      const studentId = d.studentId;

      // Cerrar matrícula en el grupo origen
      await sql`
        UPDATE enrollments 
        SET activo = FALSE, fecha_fin = CURRENT_DATE 
        WHERE student_id = ${studentId}::uuid AND group_id = ${sourceGroupId}::uuid
      `;

      if (d.action === 'promote') {
        if (targetGrado === 'EGRESADO' || !targetGroupId) {
          // Graduación / Egresado
          await sql`
            UPDATE students 
            SET grado = 'EGRESADO', activo = FALSE 
            WHERE id = ${studentId}::uuid
          `;
        } else {
          // Promoción al nuevo grupo
          await sql`
            UPDATE students 
            SET grado = ${targetGroupName}, activo = TRUE 
            WHERE id = ${studentId}::uuid
          `;
          await sql`
            INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
            VALUES (gen_random_uuid(), ${studentId}::uuid, ${targetGroupId}::uuid, TRUE, CURRENT_DATE, NOW())
            ON CONFLICT (student_id, group_id) DO UPDATE 
            SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
          `;
        }
        promotedCount++;
      } else if (d.action === 'repeat') {
        // Repite en el mismo grupo
        await sql`
          UPDATE students 
          SET grado = ${sourceGroupName}, activo = TRUE 
          WHERE id = ${studentId}::uuid
        `;
        await sql`
          INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
          VALUES (gen_random_uuid(), ${studentId}::uuid, ${sourceGroupId}::uuid, TRUE, CURRENT_DATE, NOW())
          ON CONFLICT (student_id, group_id) DO UPDATE 
          SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
        `;
        repeatedCount++;
      } else if (d.action === 'withdraw') {
        // Retiro / Deserción
        await sql`
          UPDATE students 
          SET activo = FALSE 
          WHERE id = ${studentId}::uuid
        `;
        withdrawnCount++;
      } else if (d.action === 'transfer') {
        // Traslado manual a otro grupo
        const destGroupId = d.customTargetGroupId;
        const destGrado = d.customTargetGrado || 'TRASLADADO';
        if (destGroupId) {
          await sql`
            UPDATE students 
            SET grado = ${destGrado}, activo = TRUE 
            WHERE id = ${studentId}::uuid
          `;
          await sql`
            INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
            VALUES (gen_random_uuid(), ${studentId}::uuid, ${destGroupId}::uuid, TRUE, CURRENT_DATE, NOW())
            ON CONFLICT (student_id, group_id) DO UPDATE 
            SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
          `;
        }
        transferredCount++;
      }
    }

    // Registrar en auditoría
    await logAuditEvent({
      action: 'CIERRE_Y_PROMOCION_SEMESTRE',
      category: 'ATTENDANCE',
      details: `Cierre y promoción del grupo ${sourceGroupName}: ${promotedCount} promovidos, ${repeatedCount} repitieron, ${withdrawnCount} retirados, ${transferredCount} trasladados.`,
      userEmail: adminEmail,
      userName: adminName,
    });

    revalidatePath('/admin/attendance');
    revalidatePath('/admin/attendance/enrollment');
    revalidatePath('/admin/attendance/promotion');
    revalidatePath(`/admin/attendance/group/${sourceGroupId}`);
    if (targetGroupId) {
      revalidatePath(`/admin/attendance/group/${targetGroupId}`);
    }

    return {
      success: true,
      summary: {
        total: decisions.length,
        promoted: promotedCount,
        repeated: repeatedCount,
        withdrawn: withdrawnCount,
        transferred: transferredCount,
        sourceGroup: sourceGroupName,
        targetGroup: targetGroupName || 'N/A'
      }
    };
  } catch (error: any) {
    console.error('Error in executeSemesterPromotion:', error);
    return { error: error?.message || 'Error al procesar la promoción de semestre' };
  }
}

export async function removeStudentEnrollment(studentId: string, enrollmentId: string) {
  try {
    if (!studentId || !enrollmentId) {
      return { error: 'ID de estudiante y matrícula requeridos' };
    }

    // 1. Obtener info de la matrícula que se eliminará
    const enrInfo = await sql`
      SELECT e.id, e.group_id, g.nombre as group_name
      FROM enrollments e
      JOIN groups g ON g.id = e.group_id
      WHERE e.id = ${enrollmentId}::uuid
      LIMIT 1
    `;
    const deletedGroupName = enrInfo.length > 0 ? enrInfo[0].group_name : 'desconocido';

    // 2. Eliminar la matrícula de enrollments
    await sql`DELETE FROM enrollments WHERE id = ${enrollmentId}::uuid`;

    // 3. Revisar qué matrículas activas le quedan al estudiante
    const remaining = await sql`
      SELECT e.id, g.nombre as group_name
      FROM enrollments e
      JOIN groups g ON g.id = e.group_id
      WHERE e.student_id = ${studentId}::uuid AND (e.activo IS NULL OR e.activo = TRUE)
      ORDER BY e.created_at DESC
    `;

    // 4. Si le queda al menos 1 matrícula, sincronizar students.grado con la principal
    if (remaining.length > 0) {
      const primaryGroup = remaining[0].group_name;
      await sql`
        UPDATE students 
        SET grado = ${primaryGroup} 
        WHERE id = ${studentId}::uuid
      `;
    }

    await logAuditEvent({
      action: 'STUDENT_ENROLLMENT_REMOVE',
      category: 'STUDENTS',
      details: `Se eliminó la matrícula del estudiante en el curso ${deletedGroupName}`,
      metadata: { studentId, enrollmentId, deletedGroupName, remainingCount: remaining.length }
    });

    revalidatePath('/admin/attendance/alerts');
    revalidatePath('/admin/attendance/enrollment');
    revalidatePath('/admin/attendance');
    return { success: true, remainingCount: remaining.length };
  } catch (error: any) {
    console.error('Error in removeStudentEnrollment:', error);
    return { error: error?.message || 'Error al eliminar la matrícula' };
  }
}

export async function updateStudentEnrollment(studentId: string, enrollmentId: string, newGroupId: string) {
  try {
    if (!studentId || !enrollmentId || !newGroupId) {
      return { error: 'Datos incompletos para actualizar la matrícula' };
    }

    // 1. Obtener el nombre y datos del nuevo grupo
    const newGrp = await sql`
      SELECT id, nombre, jornada, tipo, programa_nombre
      FROM groups
      WHERE id = ${newGroupId}::uuid
      LIMIT 1
    `;
    if (newGrp.length === 0) {
      return { error: 'Grupo de destino no encontrado' };
    }
    const newGroupName = newGrp[0].nombre;

    // 2. Verificar si el alumno ya está matriculado en el grupo de destino (evitar duplicar)
    const existing = await sql`
      SELECT id FROM enrollments 
      WHERE student_id = ${studentId}::uuid 
        AND group_id = ${newGroupId}::uuid 
        AND id != ${enrollmentId}::uuid
      LIMIT 1
    `;
    if (existing.length > 0) {
      // Ya tenía matrícula en el nuevo grupo, así que eliminamos la vieja para no duplicar
      await sql`DELETE FROM enrollments WHERE id = ${enrollmentId}::uuid`;
      await sql`
        UPDATE enrollments 
        SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL 
        WHERE id = ${existing[0].id}::uuid
      `;
    } else {
      // Actualizar la matrícula existente al nuevo grupo
      await sql`
        UPDATE enrollments 
        SET group_id = ${newGroupId}::uuid, activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
        WHERE id = ${enrollmentId}::uuid
      `;
    }

    // 3. Actualizar students.grado para que coincida con el nuevo curso
    await sql`
      UPDATE students 
      SET grado = ${newGroupName} 
      WHERE id = ${studentId}::uuid
    `;

    await logAuditEvent({
      action: 'STUDENT_ENROLLMENT_UPDATE',
      category: 'STUDENTS',
      details: `Se cambió la matrícula del estudiante al curso/horario ${newGroupName}`,
      metadata: { studentId, enrollmentId, newGroupId, newGroupName }
    });

    revalidatePath('/admin/attendance/alerts');
    revalidatePath('/admin/attendance/enrollment');
    revalidatePath('/admin/attendance');
    return { success: true, newGroupName };
  } catch (error: any) {
    console.error('Error in updateStudentEnrollment:', error);
    return { error: error?.message || 'Error al actualizar el curso/horario' };
  }
}

export async function keepSingleEnrollment(studentId: string, enrollmentIdToKeep: string) {
  try {
    if (!studentId || !enrollmentIdToKeep) {
      return { error: 'Datos incompletos para unificar matrícula' };
    }

    // 1. Obtener la matrícula a conservar
    const toKeep = await sql`
      SELECT e.id, e.group_id, g.nombre as group_name
      FROM enrollments e
      JOIN groups g ON g.id = e.group_id
      WHERE e.id = ${enrollmentIdToKeep}::uuid AND e.student_id = ${studentId}::uuid
      LIMIT 1
    `;
    if (toKeep.length === 0) {
      return { error: 'Matrícula seleccionada no encontrada' };
    }
    const { group_name } = toKeep[0];

    // 2. Eliminar todas las demás matrículas del estudiante
    await sql`
      DELETE FROM enrollments 
      WHERE student_id = ${studentId}::uuid AND id != ${enrollmentIdToKeep}::uuid
    `;

    // 3. Asegurar que la matrícula conservada esté activa
    await sql`
      UPDATE enrollments 
      SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
      WHERE id = ${enrollmentIdToKeep}::uuid
    `;

    // 4. Actualizar grado del estudiante
    await sql`
      UPDATE students 
      SET grado = ${group_name} 
      WHERE id = ${studentId}::uuid
    `;

    await logAuditEvent({
      action: 'STUDENT_ENROLLMENT_UNIFY',
      category: 'STUDENTS',
      details: `Se unificaron las matrículas del estudiante dejando únicamente ${group_name}`,
      metadata: { studentId, keptEnrollmentId: enrollmentIdToKeep, group_name }
    });

    revalidatePath('/admin/attendance/alerts');
    revalidatePath('/admin/attendance/enrollment');
    revalidatePath('/admin/attendance');
    return { success: true, group_name };
  } catch (error: any) {
    console.error('Error in keepSingleEnrollment:', error);
    return { error: error?.message || 'Error al unificar matrícula' };
  }
}

export async function addStudentEnrollment(studentId: string, groupId: string) {
  try {
    if (!studentId || !groupId) {
      return { error: 'ID de estudiante y grupo requeridos' };
    }

    const grp = await sql`SELECT id, nombre FROM groups WHERE id = ${groupId}::uuid LIMIT 1`;
    if (grp.length === 0) return { error: 'Grupo no encontrado' };

    await sql`
      INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
      VALUES (gen_random_uuid(), ${studentId}::uuid, ${groupId}::uuid, TRUE, CURRENT_DATE, NOW())
      ON CONFLICT (student_id, group_id) DO UPDATE 
      SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
    `;

    revalidatePath('/admin/attendance/alerts');
    revalidatePath('/admin/attendance/enrollment');
    revalidatePath('/admin/attendance');
    return { success: true, groupName: grp[0].nombre };
  } catch (error: any) {
    console.error('Error in addStudentEnrollment:', error);
    return { error: error?.message || 'Error al agregar curso/horario' };
  }
}

export interface ImportedStudentItem {
  nombre: string;
  documento?: string | null;
  usuarioNro?: string | null;
  tarjetaNumero?: string | null;
  telefono?: string | null;
  email?: string | null;
  domicilio?: string | null;
}

/**
 * Importa y matricula una lista de estudiantes directamente en un grupo oficial desde Excel
 */
export async function importStudentsToGroupAction(groupId: string, students: ImportedStudentItem[]) {
  try {
    if (!groupId || !Array.isArray(students) || students.length === 0) {
      return { error: 'Se requiere el grupo y al menos un estudiante para importar' };
    }

    const { isAdmin } = await checkIsAdminFull();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    let isTeacher = false;
    if (sessionToken) {
      try {
        const payload = await decrypt(sessionToken);
        if (payload?.teacherId || payload?.adminId) isTeacher = true;
      } catch {}
    }

    if (!isAdmin && !isTeacher) {
      return { error: 'No tienes permisos para importar estudiantes en este grupo' };
    }

    const grp = await sql`SELECT id, nombre, jornada, programa_nombre FROM groups WHERE id = ${groupId}::uuid LIMIT 1`;
    if (grp.length === 0) {
      return { error: 'Grupo oficial no encontrado' };
    }
    const groupName = grp[0].nombre;

    let createdCount = 0;
    let updatedCount = 0;

    for (const st of students) {
      const cleanNombre = (st.nombre || '').trim().toUpperCase();
      if (!cleanNombre) continue;

      const cleanDoc = (st.documento || '').trim() || null;
      const cleanUsuarioNro = (st.usuarioNro || '').trim() || cleanDoc;
      const cleanTarjeta = (st.tarjetaNumero || '').trim() || null;
      const cleanTel = (st.telefono || '').trim() || null;
      const cleanEmail = (st.email || '').trim().toLowerCase() || null;
      const cleanDom = (st.domicilio || '').trim() || null;

      // 1. Verificar si el alumno ya existe por documento, usuario_nro o coincidencia exacta de nombre
      let existingStudentId: string | null = null;
      if (cleanDoc) {
        const byDoc = await sql`
          SELECT id FROM students 
          WHERE documento = ${cleanDoc} OR usuario_nro = ${cleanDoc}
          LIMIT 1
        `;
        if (byDoc.length > 0) existingStudentId = byDoc[0].id;
      }

      if (!existingStudentId && cleanUsuarioNro) {
        const byUser = await sql`
          SELECT id FROM students WHERE usuario_nro = ${cleanUsuarioNro} LIMIT 1
        `;
        if (byUser.length > 0) existingStudentId = byUser[0].id;
      }

      if (!existingStudentId) {
        const byName = await sql`
          SELECT id FROM students 
          WHERE UPPER(TRIM(nombre)) = ${cleanNombre}
          LIMIT 1
        `;
        if (byName.length > 0) existingStudentId = byName[0].id;
      }

      if (existingStudentId) {
        // Actualizar datos del estudiante existente y su grado canónico
        await sql`
          UPDATE students 
          SET 
            nombre = ${cleanNombre},
            documento = COALESCE(${cleanDoc}, documento),
            usuario_nro = COALESCE(${cleanUsuarioNro}, usuario_nro),
            grado = ${groupName},
            activo = TRUE,
            tarjeta_numero = COALESCE(${cleanTarjeta}, tarjeta_numero),
            telefono = COALESCE(${cleanTel}, telefono),
            email = COALESCE(${cleanEmail}, email),
            domicilio = COALESCE(${cleanDom}, domicilio)
          WHERE id = ${existingStudentId}::uuid
        `;
        updatedCount++;
      } else {
        // Crear nuevo estudiante
        const inserted = await sql`
          INSERT INTO students (
            id, nombre, documento, usuario_nro, grado, activo,
            tarjeta_numero, telefono, email, domicilio, created_at
          ) VALUES (
            gen_random_uuid(), ${cleanNombre}, ${cleanDoc}, ${cleanUsuarioNro}, ${groupName}, TRUE,
            ${cleanTarjeta}, ${cleanTel}, ${cleanEmail}, ${cleanDom}, NOW()
          )
          RETURNING id
        `;
        existingStudentId = inserted[0].id;
        createdCount++;
      }

      // 2. Matricular activamente en este grupo
      await sql`
        INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
        VALUES (gen_random_uuid(), ${existingStudentId}::uuid, ${groupId}::uuid, TRUE, CURRENT_DATE, NOW())
        ON CONFLICT (student_id, group_id) DO UPDATE
        SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
      `;
    }

    await logAuditEvent({
      action: 'IMPORTACION_EXCEL_GRUPO',
      category: 'STUDENTS',
      details: `Importó lista Excel al grupo ${groupName}: ${createdCount} nuevos creados, ${updatedCount} actualizados y matriculados.`,
      metadata: { groupId, groupName, createdCount, updatedCount, total: createdCount + updatedCount }
    });

    revalidatePath(`/admin/attendance/group/${groupId}`);
    revalidatePath('/admin/attendance/enrollment');
    revalidatePath('/admin/attendance');
    revalidatePath('/admin/attendance/alerts');

    return { 
      success: true, 
      groupName, 
      createdCount, 
      updatedCount, 
      total: createdCount + updatedCount 
    };
  } catch (error: any) {
    console.error('Error in importStudentsToGroupAction:', error);
    return { error: error?.message || 'Error al importar estudiantes al grupo' };
  }
}

export interface CreateGroupInput {
  nombre: string;
  programaCodigo: string; // 'TAE' | 'AIPI' | 'PREESCOLAR'
  semestreRomano: string; // 'I' | 'II' | 'III'
  jornada: string; // 'DIURNO' | 'NOCHE' | 'SABADO'
  tipo?: string; // 'REGULAR' | 'CB'
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  selectedDays?: number[]; // [1, 2, 3, 4, 5] for Mon-Fri, [6] for Sat
  totalClases?: number;
}

export async function createGroupAction(input: CreateGroupInput) {
  try {
    const { isAdmin } = await checkIsAdminFull();
    if (!isAdmin) {
      return { error: 'No tienes permisos de administrador para crear cursos o grupos.' };
    }

    const cleanNombre = (input.nombre || '').trim().toUpperCase();
    if (!cleanNombre || cleanNombre.length < 2) {
      return { error: 'El nombre del curso es obligatorio y debe tener al menos 2 caracteres.' };
    }

    // 1. Verificar si ya existe un curso con el mismo nombre
    const existing = await sql`
      SELECT id, nombre FROM groups 
      WHERE UPPER(TRIM(nombre)) = ${cleanNombre}
      LIMIT 1
    `;
    if (existing.length > 0) {
      return { error: `Ya existe un curso registrado con el nombre "${cleanNombre}".` };
    }

    const progCode = (input.programaCodigo || 'TAE').trim().toUpperCase();
    let progNombre = 'Técnico Laboral por Competencias en Auxiliar de Enfermería';
    if (progCode === 'AIPI') {
      progNombre = 'Atención Integral a la Primera Infancia';
    } else if (progCode === 'PREESCOLAR') {
      progNombre = 'Técnico Auxiliar en Preescolar';
    }

    const cleanJornada = (input.jornada || 'DIURNO').trim().toUpperCase();
    const cleanTipo = (input.tipo || 'REGULAR').trim().toUpperCase();
    const cleanSemestre = (input.semestreRomano || 'I').trim().toUpperCase();
    const newGroupId = crypto.randomUUID();

    await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS total_clases INTEGER;`.catch(() => []);
    const customTotalClases = input.totalClases && input.totalClases > 0 ? Math.floor(input.totalClases) : null;

    // 2. Insertar nuevo grupo en la tabla groups
    await sql`
      INSERT INTO groups (
        id, nombre, nombre_clean, jornada, tipo,
        programa_codigo, programa_nombre, semestre_romano,
        modalidad, activo, created_at, updated_at, total_clases
      ) VALUES (
        ${newGroupId}::uuid,
        ${cleanNombre},
        ${cleanNombre},
        ${cleanJornada},
        ${cleanTipo},
        ${progCode},
        ${progNombre},
        ${cleanSemestre},
        'PRESENCIAL',
        TRUE,
        NOW(),
        NOW(),
        ${customTotalClases}
      )
    `;

    // 3. Generar sesiones de clase en el rango de fechas
    const diasNombres = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const startStr = input.startDate || '2026-02-01';
    const endStr = input.endDate || '2026-11-30';
    const start = new Date(startStr + 'T12:00:00Z');
    const end = new Date(endStr + 'T12:00:00Z');

    const daysToInclude = (input.selectedDays && input.selectedDays.length > 0)
      ? input.selectedDays
      : (cleanJornada === 'SABADO' ? [6] : [1, 2, 3, 4, 5]);

    const sessionsToInsert: { fecha: string; diaTexto: string }[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      const dayOfWeek = curr.getUTCDay();
      if (daysToInclude.includes(dayOfWeek)) {
        const fechaStr = curr.toISOString().split('T')[0];
        sessionsToInsert.push({
          fecha: fechaStr,
          diaTexto: diasNombres[dayOfWeek]
        });
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // Insertar sesiones en class_sessions
    for (const s of sessionsToInsert) {
      await sql`
        INSERT INTO class_sessions (id, group_id, fecha, dia_semana_texto, dia_semana_calculado, activa, created_at)
        VALUES (
          gen_random_uuid(),
          ${newGroupId}::uuid,
          ${s.fecha}::date,
          ${s.diaTexto},
          ${s.diaTexto},
          TRUE,
          NOW()
        )
        ON CONFLICT (group_id, fecha) DO NOTHING
      `;
    }

    // 4. Registrar auditoría institucional
    await logAuditEvent({
      action: 'CREACION_CURSO',
      category: 'COURSES',
      details: `Creó el curso oficial ${cleanNombre} (${progCode} - ${cleanJornada}) con ${sessionsToInsert.length} sesiones de clase.`,
      metadata: {
        groupId: newGroupId,
        nombre: cleanNombre,
        programaCodigo: progCode,
        jornada: cleanJornada,
        tipo: cleanTipo,
        semestreRomano: cleanSemestre,
        startDate: startStr,
        endDate: endStr,
        sessionsCount: sessionsToInsert.length
      }
    });

    // 5. Revalidar rutas
    revalidatePath('/admin/attendance/alerts');
    revalidatePath('/admin/attendance/enrollment');
    revalidatePath('/admin/attendance');
    revalidatePath('/admin/attendance/promotion');
    revalidatePath(`/admin/attendance/group/${newGroupId}`);

    return {
      success: true,
      groupId: newGroupId,
      groupName: cleanNombre,
      sessionsCount: sessionsToInsert.length
    };
  } catch (error: any) {
    console.error('Error in createGroupAction:', error);
    return { error: error?.message || 'Error al crear el curso o grupo' };
  }
}

/**
 * Modifica la cantidad de fechas o clases totales de un grupo.
 * Requiere permiso 'attendance_edit_total_classes' o ser Administrador General / SuperAdmin.
 */
export async function updateGroupTotalClassesAction(
  groupId: string,
  totalClases: number | null
): Promise<{ success?: boolean; error?: string; totalClases?: number | null }> {
  try {
    const session = await getActionSession();
    if (!session) {
      return { error: 'Sesión expirada o no autenticada.' };
    }

    const canEdit = 
      isSuperAdminEmail(session.email) ||
      session.role === 'admin' ||
      userHasPermission('attendance_edit_total_classes', session.role, session.permissions, session.email);

    if (!canEdit) {
      return { error: 'No tienes autorización para modificar la cantidad total de clases/fechas de este grupo.' };
    }

    // Asegurar que la columna exista de forma transparente
    await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS total_clases INTEGER;`;

    // Si viene un valor menor o igual a 0, lo guardamos como NULL (para resetear a automático)
    const val = (totalClases !== null && totalClases !== undefined && totalClases > 0) ? Math.floor(totalClases) : null;

    const grpInfo = await sql`
      UPDATE groups 
      SET total_clases = ${val}, updated_at = NOW() 
      WHERE id = ${groupId}::uuid
      RETURNING id, nombre, total_clases
    `;

    if (grpInfo.length === 0) {
      return { error: 'Grupo no encontrado.' };
    }

    const group = grpInfo[0];

    // Registrar en auditoría
    await logAuditEvent({
      action: 'MODIFICACION_CLASES_TOTALES_GRUPO',
      category: 'COURSES',
      details: `Modificó el total de clases del grupo "${group.nombre}" a ${val !== null ? `${val} clases` : 'automático'}.`,
      metadata: {
        groupId,
        groupName: group.nombre,
        totalClases: val,
        modifiedBy: session.email
      }
    });

    revalidatePath(`/admin/attendance/group/${groupId}`);
    revalidatePath('/admin/attendance/alerts');
    revalidatePath('/admin/attendance');

    return { success: true, totalClases: val };
  } catch (error: any) {
    console.error('Error in updateGroupTotalClassesAction:', error);
    return { error: error?.message || 'Error al actualizar las clases totales del grupo.' };
  }
}

/**
 * Modifica la cantidad de fechas o clases totales por defecto de una oferta educativa / programa.
 * Requiere permiso 'attendance_edit_total_classes' o ser Administrador General / SuperAdmin.
 */
export async function updateProgramTotalClassesAction(
  programId: string,
  totalClases: number | null
): Promise<{ success?: boolean; error?: string; totalClases?: number | null }> {
  try {
    const session = await getActionSession();
    if (!session) {
      return { error: 'Sesión expirada o no autenticada.' };
    }

    const canEdit = 
      isSuperAdminEmail(session.email) ||
      session.role === 'admin' ||
      userHasPermission('attendance_edit_total_classes', session.role, session.permissions, session.email);

    if (!canEdit) {
      return { error: 'No tienes autorización para modificar la cantidad total de clases de esta oferta educativa.' };
    }

    // Asegurar que la columna exista de forma transparente
    await sql`ALTER TABLE academic_programs ADD COLUMN IF NOT EXISTS total_clases INTEGER;`;

    const val = (totalClases !== null && totalClases !== undefined && totalClases > 0) ? Math.floor(totalClases) : null;

    const progInfo = await sql`
      UPDATE academic_programs 
      SET total_clases = ${val} 
      WHERE id = ${programId}
      RETURNING id, title, total_clases
    `;

    if (progInfo.length === 0) {
      return { error: 'Programa académico no encontrado.' };
    }

    const prog = progInfo[0];

    // Registrar en auditoría
    await logAuditEvent({
      action: 'MODIFICACION_CLASES_TOTALES_PROGRAMA',
      category: 'COURSES',
      details: `Modificó el total de clases de la oferta educativa "${prog.title}" a ${val !== null ? `${val} clases` : 'automático'}.`,
      metadata: {
        programId,
        programTitle: prog.title,
        totalClases: val,
        modifiedBy: session.email
      }
    });

    revalidatePath('/admin/attendance/alerts');
    revalidatePath('/admin/attendance');
    revalidatePath('/admin/pages');

    return { success: true, totalClases: val };
  } catch (error: any) {
    console.error('Error in updateProgramTotalClassesAction:', error);
    return { error: error?.message || 'Error al actualizar las clases totales de la oferta educativa.' };
  }
}


