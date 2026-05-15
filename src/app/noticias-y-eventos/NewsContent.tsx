"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Calendar, ArrowRight, Share2, Facebook, Instagram, Twitter, Video, Newspaper } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ShareButtons from "@/components/common/ShareButtons";

gsap.registerPlugin(ScrollTrigger);

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  date_text: string;
  category: string;
  link: string;
}

interface NewsContentProps {
  news: NewsItem[];
  content: Record<string, string>;
}

export default function NewsContent({ news, content }: NewsContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".reveal-item").forEach((el: any) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 95%",
            once: true,
          },
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out"
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-800 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Noticias y eventos</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          {/* Main Content */}
          <div className="lg:col-span-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {news.map((item, i) => (
                  <div key={item.id} className="reveal-item group bg-white rounded-[4rem] overflow-hidden shadow-premium border border-gray-100 transition-all duration-700 hover:-translate-y-4">
                    <div className="relative h-72">
                      <Image 
                        src={item.image_url || "/img/news/news6.jpg"} 
                        alt={item.title} 
                        fill 
                        className="object-cover transition-transform duration-1000 group-hover:scale-110" 
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-fsm-blue/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-6 left-6 py-2 px-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-black text-white tracking-widest uppercase">
                        {item.category}
                      </div>
                    </div>
                    <div className="p-10">
                       <div className="flex items-center gap-3 text-[9px] font-black text-fsm-red uppercase tracking-[0.2em] mb-4">
                          <Calendar size={14} />
                          {item.date_text}
                       </div>
                       <h3 className="text-2xl font-black text-fsm-blue mb-6 leading-[1.1] group-hover:text-fsm-red transition-colors text-balance">{item.title}</h3>
                       <p className="text-gray-700 font-medium leading-relaxed mb-10 line-clamp-2">
                          {item.description}
                       </p>
                       <a 
                        href={item.link} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-4 text-fsm-blue font-black uppercase text-[10px] tracking-widest hover:text-fsm-red transition-all mb-4"
                       >
                         Explorar noticia <ArrowRight size={18} className="text-fsm-red transition-transform group-hover:translate-x-2" />
                       </a>

                       {/* Social Sharing */}
                       <ShareButtons title={item.title} url={`/noticias-y-eventos?id=${item.id}`} />
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-12">
             <div className="sticky top-32 space-y-12">
                <div className="p-12 bg-fsm-blue rounded-[4rem] text-white shadow-premium relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fsm-red/40  rounded-full translate-x-1/2 -translate-y-1/2"></div>
                  <div className="flex items-center gap-4 mb-10">
                     <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20"><Share2 size={24} /></div>
                     <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">Comunidad <br /> Digital</h4>
                  </div>
                  <p className="text-white/60 font-medium mb-10 leading-relaxed italic">
                    Síguenos en nuestras redes oficiales para interactuar con la comunidad Mateista en tiempo real.
                  </p>
                  <div className="space-y-4">
                      <a 
                      href="https://facebook.com" 
                      target="_blank"
                      className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-fsm-blue transition-all duration-500 font-black text-[10px] tracking-widest uppercase group/social"
                     >
                       <span className="flex items-center gap-3">
                         <Facebook size={18} className="text-fsm-red group-hover/social:text-fsm-blue transition-colors" />
                         Facebook
                       </span>
                       <ArrowRight size={18} className="opacity-40" />
                     </a>
                     <a 
                      href="https://instagram.com" 
                      target="_blank" 
                      className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-fsm-blue transition-all duration-500 font-black text-[10px] tracking-widest uppercase group/social"
                     >
                       <span className="flex items-center gap-3">
                         <Instagram size={18} className="text-fsm-red group-hover/social:text-fsm-blue transition-colors" />
                         Instagram
                       </span>
                       <ArrowRight size={18} className="opacity-40" />
                     </a>
                     <a 
                      href="https://tiktok.com/@fundacionsanmateo" 
                      target="_blank" 
                      className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-fsm-blue transition-all duration-500 font-black text-[10px] tracking-widest uppercase group/social"
                     >
                       <span className="flex items-center gap-3">
                         <Video size={18} className="text-fsm-red group-hover/social:text-fsm-blue transition-colors" />
                         TikTok
                       </span>
                       <ArrowRight size={18} className="opacity-40" />
                     </a>
                     <a 
                      href="https://x.com/SanMateoF" 
                      target="_blank" 
                      className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-fsm-blue transition-all duration-500 font-black text-[10px] tracking-widest uppercase group/social"
                     >
                       <span className="flex items-center gap-3">
                         <Twitter size={18} className="text-fsm-red group-hover/social:text-fsm-blue transition-colors" />
                         X (Twitter)
                       </span>
                       <ArrowRight size={18} className="opacity-40" />
                     </a>

                  </div>
                </div>

                <div className="p-12 bg-gray-50 rounded-[4rem] border border-gray-100 text-center">
                  <h4 className="text-[10px] font-black text-gray-800 mb-8 uppercase tracking-[0.3em]">Enlaces de Interés</h4>
                  <div className="space-y-6">
                     {[
                       { name: "Oferta Académica", href: "/oferta-academica" },
                       { name: "Galería de Momentos", href: "/galeria" },
                       { name: `Calendario ${new Date().getFullYear()}`, href: "/calendario-academico" }
                     ].map((link, i) => (
                       <Link key={i} href={link.href} className="flex items-center justify-center gap-3 text-sm font-black text-fsm-blue hover:text-fsm-red transition-all group">
                         {link.name} <ChevronRight size={16} className="text-fsm-red group-hover:translate-x-2 transition-transform" />
                       </Link>
                     ))}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
  );
}
