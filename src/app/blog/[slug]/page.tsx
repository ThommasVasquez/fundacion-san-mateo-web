import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getBlogPostBySlug } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post || !post.published) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <article className="pt-40 pb-24">
        {/* Header Section */}
        <div className="px-8 md:px-16 lg:px-24 mb-16">
          <div className="max-w-4xl mx-auto">
            <Link 
              href="/blog" 
              className="flex items-center gap-2 text-fsm-red font-black text-xs tracking-widest uppercase mb-8 hover:-translate-x-2 transition-transform duration-300 w-fit"
            >
              <ArrowLeft size={16} />
              VOLVER AL BLOG
            </Link>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-fsm-blue tracking-tighter uppercase leading-[0.95] mb-8">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-8 text-xs font-black tracking-widest uppercase text-gray-700">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-fsm-red" />
                {new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-fsm-red" />
                BY {post.author}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {post.image_base64 && (
          <div className="px-4 md:px-8 lg:px-16 mb-20">
            <div className="max-w-6xl mx-auto aspect-video rounded-[3rem] overflow-hidden shadow-2xl relative">
               <img src={post.image_base64} alt={post.title} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-fsm-blue/30"></div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-8 md:px-16 lg:px-24">
          <div className="max-w-3xl mx-auto">
            <div className="prose prose-lg prose-slate max-w-none prose-headings:text-fsm-blue prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-p:text-gray-900 prose-p:leading-relaxed prose-strong:text-fsm-blue prose-img:rounded-3xl">
               {/* Converting line breaks to paragraph tags for basic formatting */}
               <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\n\s*\n/g, '</p><p>').replace(/\n/g, '<br />') }} />
            </div>
            
            <div className="mt-20 pt-10 border-t border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-fsm-blue rounded-full flex items-center justify-center text-white font-black">
                     F
                  </div>
                  <div>
                    <p className="text-[10px] font-black tracking-widest text-fsm-red uppercase">Autoría</p>
                    <p className="text-sm font-bold text-fsm-blue">{post.author}</p>
                  </div>
               </div>
               
               <div className="bg-fsm-blue/5 p-6 rounded-3xl max-w-xs">
                  <p className="text-xs font-bold text-gray-900 leading-relaxed italic">
                    "Comprometidos con la formación integral y el desarrollo humano de nuestra comunidad."
                  </p>
               </div>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
