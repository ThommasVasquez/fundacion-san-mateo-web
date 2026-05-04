"use client";

import React, { useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Newspaper, Calendar, ArrowUpRight, ArrowRight, Share2, Facebook, Instagram, Twitter, Video } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const newsItems = [
  {
    image: "/img/news/news6.jpg",
    title: "Inscripciones abiertas 2024-2",
    date: "Septiembre 2024",
    category: "Admisiones",
    description: "Nuestro Programa Técnico Laboral por Competencias en Auxiliar en Enfermería está certificado en CALIDAD. ¡TU UNIFORME GRATIS al matricularte!",
    link: "https://www.facebook.com/profile.php?id=100064034556004"
  },
  {
    image: "/img/news/news7.jpg",
    title: "Celebración graduandos 2024-1",
    date: "Junio 2024",
    category: "Institucional",
    description: "Cada día es una nueva oportunidad para cambiar tu vida y ser quien quieres ser. ¡Felicitaciones promoción 2024-1!",
    link: "https://www.facebook.com/profile.php?id=100064034556004"
  },
  {
    image: "/img/news/news8.jpg",
    title: "Segunda promoción 2023 TAE y AIPI",
    date: "Diciembre 2023",
    category: "Grados",
    description: "Un cierre de año lleno de éxitos para nuestras auxiliares en enfermería y atención a la primera infancia. ¡Siempre serán FSM!",
    link: "https://www.facebook.com/profile.php?id=100064034556004"
  },
  {
    image: "/img/news/news9.jpg",
    title: "Celebración Halloween 2023",
    date: "Octubre 2023",
    category: "Comunidad",
    description: "Una jornada llena de sonrisas y creatividad junto a nuestros estudiantes y docentes del programa de Primera Infancia.",
    link: "https://www.facebook.com/profile.php?id=100064034556004"
  },
  {
    image: "/img/news/news10.jpg",
    title: "Jornada de Bienestar",
    date: "Septiembre 2023",
    category: "Bienestar",
    description: "Momentos de integración y cuidado para toda nuestra comunidad educativa: estudiantes, docentes y personal administrativo.",
    link: "https://www.facebook.com/profile.php?id=100064034556004"
  },
  {
    image: "/img/news/news11.jpg",
    title: "Primera Promoción 2023 AIPI",
    date: "Julio 2023",
    category: "Grados",
    description: "Nuevas especialistas listas para servir en el cuidado y desarrollo de la infancia mateista.",
    link: "https://www.facebook.com/profile.php?id=100064034556004"
  }
];

export default function NewsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".reveal-item").forEach((el: any) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
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
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Cinematic Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden">
        <div className="lg:w-1/2 flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Magazine Institucional</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              NOTICIAS Y <br />
              <span className="text-fsm-red uppercase">Eventos</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Manténgase al día con los logros, celebraciones y anuncios más importantes de nuestra comunidad académica.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image src="/img/banner14.jpg" alt="Noticias FSM" fill className="object-cover scale-110 brightness-75" priority />
          {/* Gradient removed as per user request */}
          {/* Floating badge */}
          <div className="absolute bottom-12 right-12 z-20 bg-white/10  p-6 rounded-[2.5rem] border border-white/20">
             <Newspaper className="text-white opacity-50" size={32} />
          </div>
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Noticias y eventos</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          {/* Main Content */}
          <div className="lg:col-span-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {newsItems.map((item, i) => (
                  <div key={i} className="reveal-item group bg-white rounded-[4rem] overflow-hidden shadow-premium border border-gray-100 transition-all duration-700 hover:-translate-y-4">
                    <div className="relative h-72">
                      <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-fsm-blue/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-6 left-6 py-2 px-4 bg-white/10  border border-white/20 rounded-full text-[9px] font-black text-white tracking-widest uppercase">
                        {item.category}
                      </div>
                    </div>
                    <div className="p-10">
                       <div className="flex items-center gap-3 text-[9px] font-black text-fsm-red uppercase tracking-[0.2em] mb-4">
                          <Calendar size={14} />
                          {item.date}
                       </div>
                       <h3 className="text-2xl font-black text-fsm-blue mb-6 leading-[1.1] group-hover:text-fsm-red transition-colors text-balance">{item.title}</h3>
                       <p className="text-gray-400 font-medium leading-relaxed mb-10 line-clamp-2">
                          {item.description}
                       </p>
                       <a 
                        href={item.link} 
                        target="_blank"
                        className="inline-flex items-center gap-4 text-fsm-blue font-black uppercase text-[10px] tracking-widest hover:text-fsm-red transition-all"
                       >
                         Explorar noticia <ArrowRight size={18} className="text-fsm-red transition-transform group-hover:translate-x-2" />
                       </a>
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
                     <div className="p-3 bg-white/10  rounded-2xl border border-white/20"><Share2 size={24} /></div>
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
                       <ArrowUpRight size={18} className="opacity-40" />
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
                       <ArrowUpRight size={18} className="opacity-40" />
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
                       <ArrowUpRight size={18} className="opacity-40" />
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
                       <ArrowUpRight size={18} className="opacity-40" />
                     </a>
                     <a 
                      href="https://tiktok.com" 
                      target="_blank" 
                      className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-fsm-blue transition-all duration-500 font-black text-[10px] tracking-widest uppercase group/social"
                     >
                       <span className="flex items-center gap-3">
                         <Video size={18} className="text-fsm-red group-hover/social:text-fsm-blue transition-colors" />
                         TikTok
                       </span>
                       <ArrowUpRight size={18} className="opacity-40" />
                     </a>
                     <a 
                      href="https://twitter.com" 
                      target="_blank" 
                      className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-fsm-blue transition-all duration-500 font-black text-[10px] tracking-widest uppercase group/social"
                     >
                       <span className="flex items-center gap-3">
                         <Twitter size={18} className="text-fsm-red group-hover/social:text-fsm-blue transition-colors" />
                         X (Twitter)
                       </span>
                       <ArrowUpRight size={18} className="opacity-40" />
                     </a>
                  </div>
                </div>

                <div className="p-12 bg-gray-50 rounded-[4rem] border border-gray-100 text-center">
                  <h4 className="text-[10px] font-black text-gray-300 mb-8 uppercase tracking-[0.3em]">Enlaces de Interés</h4>
                  <div className="space-y-6">
                     {[
                       { name: "Oferta Académica", href: "/oferta-academica" },
                       { name: "Galería de Momentos", href: "/galeria" },
                       { name: "Calendario 2024", href: "/calendario-academico" }
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

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
