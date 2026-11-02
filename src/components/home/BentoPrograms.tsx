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
  details?: {
    show_label?: boolean;
    label_text?: string;
  };
}

interface BentoProgramsProps {
  content?: Record<string, string>;
  programs?: Program[];
}

interface BentoCardProps {
  program: Program;
  index: number;
  variant?: 'tall' | 'wide' | 'medium' | 'compact';
  className?: string;
  getProgramStyles: (title: string, index: number) => { icon: React.ReactNode; bg: string };
  getBentoImage: (program: Program, index: number) => string;
}

const BentoCard = ({ 
  program, 
  index, 
  variant = 'medium', 
  className = '',
  getProgramStyles,
  getBentoImage 
}: BentoCardProps) => {
  const styles = getProgramStyles(program.title, index);
  const image = getBentoImage(program, index);

  const isTall = variant === 'tall';
  const isWide = variant === 'wide';
  const isMedium = variant === 'medium';
  const isCompact = variant === 'compact';

  return (
    <Link 
      href={program.href}
      className={`bento-item relative group rounded-[2.5rem] sm:rounded-[3.5rem] lg:rounded-[4rem] overflow-hidden shadow-premium block transition-all duration-500 w-full ${className}`}
    >
      <Image 
        src={image} 
        alt={program.title} 
        fill 
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={index < 2}
        className="object-cover transition-transform duration-1000 group-hover:scale-110 brightness-75 group-hover:brightness-50"
      />
      <div className={`absolute inset-0 p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-end text-white z-10 ${styles.bg}`}>
        <div className={`rounded-2xl sm:rounded-3xl flex items-center justify-center border border-white/30 transform group-hover:rotate-6 transition-transform duration-500 bg-white/30 ${
          isTall || isWide 
            ? 'mb-4 sm:mb-6 w-14 h-14 sm:w-16 sm:h-16' 
            : 'mb-3 sm:mb-4 w-11 h-11 sm:w-12 sm:h-12'
        }`}>
          {styles.icon}
        </div>
        {program.details?.show_label !== false && (
          <p className={`font-black tracking-widest uppercase opacity-75 ${
            isCompact ? 'text-[8px] sm:text-[9px] mb-1.5 sm:mb-2' : 'text-[9px] sm:text-xs mb-2 sm:mb-4'
          }`}>
            {program.details?.label_text || "Técnico Laboral por Competencias"}
          </p>
        )}
        <h4 className={`font-black leading-tight uppercase tracking-tight ${
          isTall 
            ? 'text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6' 
            : isWide 
              ? 'text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6' 
              : isMedium 
                ? 'text-xl sm:text-2xl md:text-3xl mb-3 sm:mb-4' 
                : 'text-base sm:text-lg md:text-xl mb-2 sm:mb-3 line-clamp-2'
        }`}>
          {program.title}
        </h4>
        {isTall || isWide || isMedium ? (
          <button className={`flex items-center gap-2 font-black text-[10px] tracking-widest px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl w-fit transition-all duration-300 ${
            index % 2 === 0
              ? 'bg-white text-fsm-blue group-hover:bg-fsm-red group-hover:text-white'
              : 'bg-fsm-blue text-white group-hover:bg-white group-hover:text-fsm-blue'
          }`}>
            EXPLORAR PROGRAMA <ArrowRight size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-2 font-black text-[10px] tracking-widest uppercase group-hover:translate-x-1.5 transition-transform mt-1">
            <span>Explorar programa</span>
            <ArrowRight size={14} />
          </div>
        )}
      </div>
    </Link>
  );
};

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

  const getBentoImage = (program: Program, index: number) => {
    // Si la imagen configurada es válida y no es un fallback genérico o repetido, usarla
    if (
      program.image_url &&
      !program.image_url.includes('banner1') &&
      !program.image_url.includes('banner6') &&
      !program.image_url.startsWith('/api/documents/file/')
    ) {
      return program.image_url;
    }
    const t = `${program.href || ''} ${program.title || ''}`.toLowerCase();
    if (t.includes('enfermer') || index === 0) return '/img/image18.jpg';
    if (t.includes('infancia') || index === 1) return '/img/image27.jpg';
    if (t.includes('preescolar')) return '/img/image25.jpg';
    if (t.includes('sistema') || t.includes('cliente') || t.includes('informaci')) return '/img/image8.jpg';
    if (t.includes('ingles') || t.includes('inglés')) return '/img/image10.jpg';
    if (t.includes('contabil') || index === 3) return '/img/servicio-al-cliente.jpg';
    return '/img/image15.jpg';
  };

  const renderBentoGrid = () => {
    const count = programs.length;
    if (count === 0) return null;

    const cardProps = {
      getProgramStyles,
      getBentoImage,
    };

    // Case 1
    if (count === 1) {
      return (
        <div className="grid grid-cols-1 gap-8">
          <BentoCard {...cardProps} program={programs[0]} index={0} variant="wide" className="h-[500px]" />
        </div>
      );
    }

    // Case 2
    if (count === 2) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <BentoCard {...cardProps} program={programs[0]} index={0} variant="wide" className="lg:col-span-7 h-[500px]" />
          <BentoCard {...cardProps} program={programs[1]} index={1} variant="wide" className="lg:col-span-5 h-[500px]" />
        </div>
      );
    }

    // Case 3
    if (count === 3) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col">
            <BentoCard {...cardProps} program={programs[0]} index={0} variant="tall" className="h-full min-h-[500px] lg:min-h-[660px]" />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-8 justify-between">
            <BentoCard {...cardProps} program={programs[1]} index={1} variant="wide" className="h-[310px]" />
            <BentoCard {...cardProps} program={programs[2]} index={2} variant="wide" className="h-[310px]" />
          </div>
        </div>
      );
    }

    // Case 4 (The classic 4-item bento: 1 tall on left, 1 wide top-right, 2 compact bottom-right)
    if (count === 4) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col">
            <BentoCard {...cardProps} program={programs[0]} index={0} variant="tall" className="h-full min-h-[500px] lg:min-h-[700px]" />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-8 justify-between">
            <BentoCard {...cardProps} program={programs[1]} index={1} variant="wide" className="h-[380px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <BentoCard {...cardProps} program={programs[2]} index={2} variant="compact" className="h-[290px]" />
              <BentoCard {...cardProps} program={programs[3]} index={3} variant="compact" className="h-[290px]" />
            </div>
          </div>
        </div>
      );
    }

    // Case 5 (5 items: 1 tall on left, 1 wide top-right, 3 compact bottom-right)
    if (count === 5) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col">
            <BentoCard {...cardProps} program={programs[0]} index={0} variant="tall" className="h-full min-h-[500px] lg:min-h-[700px]" />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-8 justify-between">
            <BentoCard {...cardProps} program={programs[1]} index={1} variant="wide" className="h-[380px]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <BentoCard {...cardProps} program={programs[2]} index={2} variant="compact" className="h-[290px]" />
              <BentoCard {...cardProps} program={programs[3]} index={3} variant="compact" className="h-[290px]" />
              <BentoCard {...cardProps} program={programs[4]} index={4} variant="compact" className="h-[290px]" />
            </div>
          </div>
        </div>
      );
    }

    // Case 6 (6 items: 1 tall on left, top-right has 2 medium cards, bottom-right has 3 compact cards)
    if (count === 6) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col">
            <BentoCard {...cardProps} program={programs[0]} index={0} variant="tall" className="h-full min-h-[500px] lg:min-h-[720px]" />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-6 justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <BentoCard {...cardProps} program={programs[1]} index={1} variant="medium" className="h-[345px]" />
              <BentoCard {...cardProps} program={programs[2]} index={2} variant="medium" className="h-[345px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <BentoCard {...cardProps} program={programs[3]} index={3} variant="compact" className="h-[345px]" />
              <BentoCard {...cardProps} program={programs[4]} index={4} variant="compact" className="h-[345px]" />
              <BentoCard {...cardProps} program={programs[5]} index={5} variant="compact" className="h-[345px]" />
            </div>
          </div>
        </div>
      );
    }

    // Case 7 (7 items: Left has 1 medium + 2 compact, Right has 1 wide + 3 compact)
    if (count === 7) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
            <BentoCard {...cardProps} program={programs[0]} index={0} variant="medium" className="h-[360px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <BentoCard {...cardProps} program={programs[1]} index={1} variant="compact" className="h-[330px]" />
              <BentoCard {...cardProps} program={programs[2]} index={2} variant="compact" className="h-[330px]" />
            </div>
          </div>
          <div className="lg:col-span-7 flex flex-col gap-6 justify-between">
            <BentoCard {...cardProps} program={programs[3]} index={3} variant="wide" className="h-[360px]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <BentoCard {...cardProps} program={programs[4]} index={4} variant="compact" className="h-[330px]" />
              <BentoCard {...cardProps} program={programs[5]} index={5} variant="compact" className="h-[330px]" />
              <BentoCard {...cardProps} program={programs[6]} index={6} variant="compact" className="h-[330px]" />
            </div>
          </div>
        </div>
      );
    }

    // Case 8 (8 items: 2 balanced inverted bento tiers of 4)
    if (count === 8) {
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 flex flex-col">
              <BentoCard {...cardProps} program={programs[0]} index={0} variant="tall" className="h-full min-h-[480px] lg:min-h-[580px]" />
            </div>
            <div className="lg:col-span-7 flex flex-col gap-6 justify-between">
              <BentoCard {...cardProps} program={programs[1]} index={1} variant="wide" className="h-[280px]" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <BentoCard {...cardProps} program={programs[2]} index={2} variant="compact" className="h-[270px]" />
                <BentoCard {...cardProps} program={programs[3]} index={3} variant="compact" className="h-[270px]" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 flex flex-col gap-6 justify-between">
              <BentoCard {...cardProps} program={programs[4]} index={4} variant="wide" className="h-[280px]" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <BentoCard {...cardProps} program={programs[5]} index={5} variant="compact" className="h-[270px]" />
                <BentoCard {...cardProps} program={programs[6]} index={6} variant="compact" className="h-[270px]" />
              </div>
            </div>
            <div className="lg:col-span-5 flex flex-col">
              <BentoCard {...cardProps} program={programs[7]} index={7} variant="tall" className="h-full min-h-[480px] lg:min-h-[580px]" />
            </div>
          </div>
        </div>
      );
    }

    // Case > 8: Primary 5-item bento + responsive balanced grid for remaining
    const primary = programs.slice(0, 5);
    const remaining = programs.slice(5);

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col">
            <BentoCard {...cardProps} program={primary[0]} index={0} variant="tall" className="h-full min-h-[500px] lg:min-h-[700px]" />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-8 justify-between">
            <BentoCard {...cardProps} program={primary[1]} index={1} variant="wide" className="h-[380px]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <BentoCard {...cardProps} program={primary[2]} index={2} variant="compact" className="h-[290px]" />
              <BentoCard {...cardProps} program={primary[3]} index={3} variant="compact" className="h-[290px]" />
              <BentoCard {...cardProps} program={primary[4]} index={4} variant="compact" className="h-[290px]" />
            </div>
          </div>
        </div>
        <div className={`grid grid-cols-1 ${remaining.length % 2 === 0 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-6`}>
          {remaining.map((p, idx) => (
            <BentoCard 
              key={p.id} 
              {...cardProps}
              program={p} 
              index={5 + idx} 
              variant="compact" 
              className="h-[300px]" 
            />
          ))}
        </div>
      </div>
    );
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

        {/* Dynamic Bento Grid */}
        {renderBentoGrid()}

        <div className="mt-20 flex justify-center">
          <div className="bg-fsm-red/5 p-12 md:p-16 lg:p-20 rounded-[4rem] border border-fsm-red/10 flex flex-col lg:flex-row items-center gap-12 justify-between w-full max-w-7xl shadow-sm relative overflow-hidden">
            <p className="text-fsm-red font-black text-3xl md:text-4xl lg:text-5xl italic uppercase tracking-tighter text-center lg:text-left leading-none relative z-10" dangerouslySetInnerHTML={{ __html: content['home_promo_banner_text'] || '¡Matricúlate hoy y obtén tu <span class="underline decoration-wavy">Uniforme Gratis</span>!' }}>
            </p>
            <div className="relative group">
              <div className="absolute inset-4 animate-glow-pulse rounded-full -z-10"></div>
              <Link 
                href={content['navbar_inscripciones_link'] || content['home_promo_banner_link'] || "https://fundacionsanmateosoacha.escalapages.com/centro-de-ventas"}
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
