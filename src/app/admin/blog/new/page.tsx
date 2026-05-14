import BlogForm from '@/components/admin/BlogForm';

export default function NewBlogPostPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-fsm-blue tracking-tighter uppercase">Crear Artículo</h1>
        <p className="text-gray-900 mt-2">Redacta una nueva historia para la comunidad de la Fundación San Mateo.</p>
      </div>
      <BlogForm />
    </div>
  );
}
