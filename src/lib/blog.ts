import { sql } from './db';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_base64: string | null;
  author: string;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getBlogPosts(onlyPublished = true): Promise<BlogPost[]> {
  try {
    let posts;
    if (onlyPublished) {
      posts = await sql`SELECT * FROM blog_posts WHERE published = true ORDER BY created_at DESC`;
    } else {
      posts = await sql`SELECT * FROM blog_posts ORDER BY created_at DESC`;
    }
    return posts as unknown as BlogPost[];
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const posts = await sql`SELECT * FROM blog_posts WHERE slug = ${slug} LIMIT 1`;
    if (posts.length === 0) return null;
    return posts[0] as unknown as BlogPost;
  } catch (error) {
    console.error('Error fetching blog post by slug:', error);
    return null;
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const posts = await sql`SELECT * FROM blog_posts WHERE id = ${id} LIMIT 1`;
    if (posts.length === 0) return null;
    return posts[0] as unknown as BlogPost;
  } catch (error) {
    console.error('Error fetching blog post by id:', error);
    return null;
  }
}
