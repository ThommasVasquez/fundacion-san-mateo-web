import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getBlogPosts } from '@/lib/blog';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export default async function BlogListingPage() {
  const posts = await getBlogPosts(true);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-40 pb-24 px-8 md:px-16 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-fsm-red font-black tracking-[0.3em] uppercase text-xs mb-4 inline-block">Comunidad & Academia</span>
            <h1 className="text-6xl md:text-8xl font-black text-fsm-blue tracking-tighter uppercase leading-[0.9]">
              NUESTRO <br />
              <span className="text-fsm-blue-light">BLOG</span>
            </h1>
            <p className="text-xl text-gray-700 mt-6 max-w-xl font-medium">
              Historias, noticias y consejos para potenciar tu desarrollo profesional y personal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {posts.length === 0 ? (
              <p className="col-span-full text-center py-20 text-gray-700 font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 rounded-[3rem]">
                Próximamente más historias...
              </p>
            ) : (
              posts.map((post) => (
                <Link 
                  key={post.id} 
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col bg-gray-50 rounded-[3rem] overflow-hidden hover:bg-white hover:shadow-premium transition-all duration-700 border border-transparent hover:border-gray-100"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {post.image_base64 ? (
                      <img 
                        src={post.image_base64} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                      />
                    ) : (
                      <div className="w-full h-full bg-fsm-blue/5 flex items-center justify-center text-fsm-blue/20">
                         <Calendar size={64} strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute top-6 left-6">
                       <span className="bg-white/90  text-fsm-blue text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-2">
                          <Calendar size={12} className="text-fsm-red" />
                          {formatDateDDMMYYYY(post.created_at)}
                       </span>
                    </div>
                  </div>

                  <div className="p-10 flex-1 flex flex-col">
                    <h3 className="text-2xl font-black text-fsm-blue mb-4 leading-snug line-clamp-2 group-hover:text-fsm-red transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-900 text-sm font-medium line-clamp-3 mb-8 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto flex items-center gap-4 text-fsm-blue font-black text-xs tracking-widest uppercase">
                       LEER MÁS
                       <div className="w-8 h-8 rounded-full bg-fsm-blue text-white flex items-center justify-center group-hover:translate-x-2 transition-transform duration-500">
                          <ArrowRight size={14} />
                       </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
