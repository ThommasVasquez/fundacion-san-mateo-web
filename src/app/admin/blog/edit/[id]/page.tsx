import BlogForm from '@/components/admin/BlogForm';
import { getBlogPostById } from '@/lib/blog';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getBlogPostById(id);

  if (!post) {
    notFound();
  }

  // Serialize dates for client component
  const serializedPost = {
    ...post,
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at.toISOString(),
  } as any;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-fsm-blue tracking-tighter uppercase">Editar Artículo</h1>
        <p className="text-gray-500 mt-2">Modifica el contenido de "{post.title}".</p>
      </div>
      <BlogForm initialData={serializedPost} />
    </div>
  );
}
