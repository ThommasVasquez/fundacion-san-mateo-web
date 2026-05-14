import { getAllContent } from '@/lib/content';
import ContentEditor from '@/components/admin/ContentEditor';
import { Layout } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const allContent = await getAllContent();

  const serializedDocs = allContent.map(doc => ({
    ...doc,
    updated_at: (doc.updated_at as Date).toISOString()
  })) as any;

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-fsm-blue tracking-tighter uppercase">Gestor Educativo</h1>
          <p className="text-gray-900 mt-2">Administra el alma digital de la Fundación San Mateo.</p>
        </div>
        
        <div className="flex items-center gap-4">
           <Link 
            href="/admin/blog" 
            className="flex items-center gap-3 bg-white border border-gray-100 p-4 pr-8 rounded-3xl shadow-sm hover:shadow-premium hover:border-fsm-red/20 transition-all group"
           >
              <div className="w-10 h-10 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue group-hover:bg-fsm-red group-hover:text-white transition-all">
                <Layout size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest text-gray-700 uppercase leading-none mb-1">Módulo</p>
                <p className="text-sm font-black text-fsm-blue uppercase">Gestionar Blog</p>
              </div>
           </Link>
        </div>
      </div>
      
      <div className="pt-8 border-t border-gray-100">
        <div className="mb-8">
            <h2 className="text-xl font-black text-fsm-blue tracking-tighter uppercase">Contenido General</h2>
            <p className="text-sm text-gray-700">Edita los textos de la página principal y subpáginas.</p>
        </div>
        <ContentEditor initialData={serializedDocs} />
      </div>
    </div>
  );
}
