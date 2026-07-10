"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap, Users, Laptop, Calculator } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Program {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  href: string;
}

interface BentoProgramsProps {
  content?: Record<string, string>;
  programs?: Program[];
}

const BentoPrograms = ({ content = {}, programs = [] }: BentoProgramsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".bento-item", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 95%",
          once: true,
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power2.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Map icons and colors based on index or title keywords
  const getProgramStyles = (title: string, index: number) => {
    const t = title.toLowerCase();
    if (t.includes('enfermería') || index === 0) return { icon: <GraduationCap size={32} />, bg: 'bg-fsm-blue/80' };
    if (t.includes('infancia') || index === 1) return { icon: <Users size={32} />, bg: 'bg-fsm-red/80' };
    if (t.includes('sistemas') || index === 2) return { icon: <Laptop size={24} />, bg: 'bg-fsm-blue/80', small: true };
    if (t.includes('contabilidad') || index === 3) return { icon: <Calculator size={24} />, bg: 'bg-fsm-red/80', small: true };
    return { icon: <GraduationCap size={24} />, bg: index % 2 === 0 ? 'bg-fsm-blue/80' : 'bg-fsm-red/80', small: true };
  };

  return (
    <section ref={containerRef} className="py-32 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-sm font-black text-fsm-red tracking-[0.4em] uppercase mb-6 flex items-center gap-4">
              <span className="w-12 h-px bg-fsm-red"></span>
              {content['home_programs_subtitle'] || 'Oferta Programática'}
            </h2>
            <h3 className="text-5xl md:text-6xl font-black text-fsm-blue leading-tight uppercase font-display" dangerouslySetInnerHTML={{ __html: content['home_programs_title'] || 'Elige tu camino hacia la <br /><span class="text-fsm-red">Excelencia</span>' }}>
            </h3>
          </div>
          <Link 
            href="/oferta-academica"
            className="group flex items-center gap-3 font-black text-xs tracking-widest text-fsm-blue hover:text-fsm-red transition-colors mb-4"
          >
            VER TODA LA OFERTA <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">
          {/* slot 1: Featured Large Vertical */}
          {programs[0] && (
            <Link 
              href={programs[0].href}
              className="bento-item md:col-span-8 lg:col-span-5 relative group rounded-[4rem] overflow-hidden shadow-premium h-[500px] lg:min-h-[700px]"
            >
                <Image 
                  src={programs[0].image_url} 
                  alt={programs[0].title} 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-110 brightness-75 group-hover:brightness-50"
                />
              <div className={`absolute inset-0 p-12 flex flex-col justify-end text-white z-10 ${getProgramStyles(programs[0].title, 0).bg}`}>
                <div className="mb-6 w-16 h-16 bg-white/30 rounded-3xl flex items-center justify-center border border-white/30 transform group-hover:rotate-12 transition-transform duration-500">
                  {getProgramStyles(programs[0].title, 0).icon}
                </div>
                <p className="text-xs font-black tracking-widest mb-4 uppercase opacity-70">Técnico Laboral por Competencias</p>
                <h4 className="text-3xl md:text-4xl font-black mb-6 leading-tight uppercase">
                  {programs[0].title}
                </h4>
                <button className="flex items-center gap-2 font-black text-[10px] tracking-widest bg-white text-fsm-blue px-8 py-4 rounded-2xl w-fit group-hover:bg-fsm-red group-hover:text-white transition-all duration-300">
                  EXPLORAR PROGRAMA <ArrowRight size={14} />
                </button>
              </div>
            </Link>
          )}

          <div className="md:col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            {/* slot 2: Featured Large Horizontal */}
            {programs[1] && (
              <Link 
                href={programs[1].href}
                className="bento-item md:col-span-2 relative group rounded-[4rem] overflow-hidden shadow-premium h-[400px]"
              >
                  <Image 
                    src={programs[1].image_url} 
                    alt={programs[1].title} 
                    fill 
                    priority
                    className="object-cover transition-transform duration-1000 group-hover:scale-110 brightness-75 group-hover:brightness-50"
                  />
                <div className={`absolute inset-0 p-12 flex flex-col justify-end text-white z-10 ${getProgramStyles(programs[1].title, 1).bg}`}>
                  <div className="mb-6 w-16 h-16 bg-white/30 rounded-3xl flex items-center justify-center border border-white/30 transform group-hover:-rotate-12 transition-transform duration-500">
                    {getProgramStyles(programs[1].title, 1).icon}
                  </div>
                  <p className="text-xs font-black tracking-widest mb-4 uppercase opacity-70">Técnico Laboral por Competencias</p>
                  <h4 className="text-3xl md:text-4xl font-black mb-6 leading-tight uppercase">
                    {programs[1].title}
                  </h4>
                  <button className="flex items-center gap-2 font-black text-[10px] tracking-widest bg-fsm-blue text-white px-8 py-4 rounded-2xl w-fit group-hover:bg-white group-hover:text-fsm-blue transition-all duration-300">
                    EXPLORAR PROGRAMA <ArrowRight size={14} />
                  </button>
                </div>
              </Link>
            )}

            {/* slot 3: Smaller Square */}
            {programs[2] && (
              <Link 
                href={programs[2].href}
                className="bento-item relative group rounded-[4rem] overflow-hidden shadow-premium h-[300px]"
              >
                <Image 
                  src={programs[2].image_url} 
                  alt={programs[2].title} 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-110 brightness-75 group-hover:brightness-50"
                />
                <div className={`absolute inset-0 p-8 flex flex-col justify-end text-white z-10 ${getProgramStyles(programs[2].title, 2).bg}`}>
                  <div className="mb-4 w-12 h-12 bg-white/30 rounded-2xl flex items-center justify-center border border-white/30 transform group-hover:rotate-12 transition-transform duration-500">
                    {getProgramStyles(programs[2].title, 2).icon}
                  </div>
                  <h4 className="text-xl md:text-2xl font-black mb-2 uppercase leading-none">
                    {programs[2].title}
                  </h4>
                  <div className="flex items-center gap-2 font-black text-[10px] tracking-widest uppercase mt-4 group-hover:text-fsm-red transition-colors">
                    Explorar programa <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            )}

            {/* slot 4: Smaller Square */}
            {programs[3] && (
              <Link 
                href={programs[3].href}
                className="bento-item relative group rounded-[4rem] overflow-hidden shadow-premium h-[300px]"
              >
                <Image 
                  src={programs[3].image_url} 
                  alt={programs[3].title} 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-110 brightness-75 group-hover:brightness-50"
                />
                <div className={`absolute inset-0 p-8 flex flex-col justify-end text-white z-10 ${getProgramStyles(programs[3].title, 3).bg}`}>
                  <div className="mb-4 w-12 h-12 bg-white/30 rounded-2xl flex items-center justify-center border border-white/30 transform group-hover:-rotate-12 transition-transform duration-500">
                    {getProgramStyles(programs[3].title, 3).icon}
                  </div>
                  <h4 className="text-xl md:text-2xl font-black mb-2 uppercase leading-none">
                    {programs[3].title}
                  </h4>
                  <div className="flex items-center gap-2 font-black text-[10px] tracking-widest uppercase mt-4 group-hover:text-fsm-blue transition-colors">
                    Explorar programa <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        <div className="mt-20 flex justify-center">
          <div className="bg-fsm-red/5 p-12 md:p-16 lg:p-20 rounded-[4rem] border border-fsm-red/10 flex flex-col lg:flex-row items-center gap-12 justify-between w-full max-w-7xl shadow-sm relative overflow-hidden">
            <p className="text-fsm-red font-black text-3xl md:text-4xl lg:text-5xl italic uppercase tracking-tighter text-center lg:text-left leading-none relative z-10" dangerouslySetInnerHTML={{ __html: content['home_promo_banner_text'] || '¡Matricúlate hoy y obtén tu <span class="underline decoration-wavy">Uniforme Gratis</span>!' }}>
            </p>
            <div className="relative group">
              <div className="absolute inset-4 animate-glow-pulse rounded-full -z-10"></div>
              <Link 
                href={content['home_promo_banner_link'] || "https://fundacionsanmateosoacha.escalapages.com/centro-de-ventas"}
                target="_blank"
                className="relative z-10 bg-fsm-red text-white px-12 py-6 rounded-3xl font-black text-sm md:text-base tracking-widest hover:scale-105 active:scale-95 transition-all shadow-premium whitespace-nowrap block"
              >
                INSCRIBIRSE AHORA
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BentoPrograms;
