import { Layout, FileText } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-fsm-blue tracking-tighter uppercase">Gestor Educativo</h1>
          <p className="text-gray-900 mt-2 font-medium">Administra el alma digital de la Fundación San Mateo.</p>
        </div>
      </div>
      
      <div className="pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            href="/admin/pages/home" 
            className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-red/20 transition-all group"
          >
            <div className="w-14 h-14 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue group-hover:bg-fsm-red group-hover:text-white transition-all">
              <Layout size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase leading-none mb-1">Editor Visual</p>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">Gestor Global</h3>
            </div>
          </Link>

          <Link 
            href="/admin/blog" 
            className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-red/20 transition-all group"
          >
            <div className="w-14 h-14 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue group-hover:bg-fsm-red group-hover:text-white transition-all">
              <FileText size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase leading-none mb-1">Publicaciones</p>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">Gestionar Blog</h3>
            </div>
          </Link>
      </div>
    </div>
  );
}
