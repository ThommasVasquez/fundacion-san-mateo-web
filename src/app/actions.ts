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
    const users = await sql`SELECT id, password_hash FROM admin_users WHERE email = ${email} LIMIT 1`;
    if (users.length === 0) {
      return { error: 'Credenciales inválidas' };
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { error: 'Credenciales inválidas' };
    }

    // Create session
    const sessionToken = await encrypt({ adminId: user.id });
    
    (await cookies()).set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return { success: true };
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

