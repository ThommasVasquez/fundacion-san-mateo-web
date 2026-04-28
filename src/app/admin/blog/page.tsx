import { getBlogPosts } from '@/lib/blog';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Calendar, Eye } from 'lucide-react';
import { deleteBlogPost } from '@/app/actions';
import { revalidatePath } from 'next/cache';
import DeletePostButton from '@/components/admin/DeletePostButton';

export const dynamic = 'force-dynamic';

async function handleDelete(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  await deleteBlogPost(id);
  revalidatePath('/admin/blog');
  revalidatePath('/blog');
}

export default async function AdminBlogPage() {
  const rawPosts = await getBlogPosts(false);
  
  // Serialize dates to prevent hydration errors
  const posts = rawPosts.map(p => ({
    ...p,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString()
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-fsm-blue tracking-tighter uppercase">Gestión de Blog</h1>
          <p className="text-gray-500 mt-2">Crea y administra los artículos de la institución.</p>
        </div>
        <Link 
          href="/admin/blog/new" 
          className="flex items-center gap-2 bg-fsm-red text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-fsm-blue transition-all w-fit shadow-lg shadow-fsm-red/20"
        >
          <Plus size={18} />
          NUEVO ARTÍCULO
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {posts.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-dashed border-gray-200 text-center">
            <p className="text-gray-400 font-medium">No hay artículos publicados aún.</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-3xl shadow-premium border border-gray-100 flex flex-col md:flex-row items-center gap-6 group hover:border-fsm-red/20 transition-all">
              <div className="md:col-span-2 w-full md:w-32 h-24 bg-gray-100 rounded-2xl overflow-hidden relative shrink-0">
                {post.image_base64 ? (
                   <img src={post.image_base64} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Calendar size={32} />
                   </div>
                )}
              </div>
              
              <div className="flex-1 space-y-1 text-center md:text-left overflow-hidden">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${post.published ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {post.published ? 'Publicado' : 'Borrador'}
                  </span>
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(post.created_at).toLocaleDateString('es-CO')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-fsm-blue truncate">{post.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-1">{post.excerpt}</p>
              </div>

              <div className="flex items-center gap-2">
                <Link 
                  href={`/blog/${post.slug}`} 
                  target="_blank"
                  className="p-3 text-gray-400 hover:text-fsm-blue hover:bg-fsm-blue/5 rounded-xl transition-all"
                  title="Ver publicado"
                >
                  <Eye size={20} />
                </Link>
                <Link 
                  href={`/admin/blog/edit/${post.id}`}
                  className="p-3 text-gray-400 hover:text-fsm-red hover:bg-fsm-red/5 rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit2 size={20} />
                </Link>
                <DeletePostButton id={post.id} onDelete={handleDelete} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
