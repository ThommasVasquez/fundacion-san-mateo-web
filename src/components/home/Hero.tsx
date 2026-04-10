"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLSpanElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.fromTo(leftRef.current, 
        { xPercent: -100 }, 
        { xPercent: 0, duration: 1.5 }
      )
      .fromTo(rightRef.current, 
        { xPercent: 100 }, 
        { xPercent: 0, duration: 1.5 }, 
        "<"
      )
      .fromTo(subtitleRef.current, 
        { y: 20, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.8 }, 
        "-=0.5"
      )
      .fromTo(titleRef.current, 
        { y: 40, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 1 }, 
        "-=0.6"
      )
      .fromTo(descRef.current, 
        { y: 20, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.8 }, 
        "-=0.7"
      )
      .fromTo(ctaRef.current, 
        { scale: 0.9, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.8 }, 
        "-=0.5"
      );

      // Parallax on mouse move
      const handleMouseMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const xPos = (clientX / window.innerWidth - 0.5) * 20;
        const yPos = (clientY / window.innerHeight - 0.5) * 20;

        gsap.to(".hero-parallax", {
          x: xPos,
          y: yPos,
          duration: 1,
          ease: "power2.out"
        });
      };

      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-white pt-20">
      {/* Left Side: Content */}
      <div 
        ref={leftRef}
        className="lg:w-[60%] flex items-center justify-start px-8 md:px-20 lg:px-32 relative z-10 bg-white"
      >
        <div className="max-w-xl py-20">
          <span 
            ref={subtitleRef}
            className="inline-flex items-center gap-2 text-fsm-red font-black tracking-[0.3em] uppercase text-xs mb-8"
          >
            <span className="w-8 h-px bg-fsm-red"></span>
            Excelencia en Educación Superior
          </span>
          
          <h1 
            ref={titleRef}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-fsm-blue mb-8 leading-[0.95] text-balance"
          >
            FORJANDO <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fsm-blue to-fsm-blue-light">FUTUROS</span> <br />
            BRILLANTES
          </h1>
          
          <p 
            ref={descRef}
            className="text-lg md:text-xl text-gray-500 mb-12 max-w-lg leading-relaxed font-medium"
          >
            Institución de educación para el trabajo y desarrollo humano en Soacha, comprometida con la formación integral y la calidad técnica.
          </p>
          
          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <Link 
              href="/oferta-academica"
              className="group flex items-center gap-4 bg-fsm-blue text-white px-10 py-5 rounded-full font-black text-xs tracking-widest hover:bg-fsm-red transition-all duration-500 shadow-premium"
            >
              EXPLORAR PROGRAMAS
              <ArrowRight className="group-hover:translate-x-2 transition-transform" size={18} />
            </Link>
            
            <button className="flex items-center gap-3 text-fsm-blue font-black text-xs tracking-widest group">
              <span className="w-12 h-12 flex items-center justify-center bg-fsm-blue/5 rounded-full group-hover:bg-fsm-blue/10 transition-colors">
                <Play className="fill-fsm-blue ml-1" size={16} />
              </span>
              VER VIDEO INSTITUCIONAL
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-20 grid grid-cols-2 gap-8 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-fsm-red" />
              <p className="text-[10px] font-black tracking-widest leading-tight">ISO 9001:2015 <br /> CERTIFICADOS</p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-fsm-red" />
              <p className="text-[10px] font-black tracking-widest leading-tight">SECRETARÍA EDUCACIÓN <br /> APROBADOS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Visual */}
      <div 
        ref={rightRef}
        className="lg:w-[40%] relative min-h-[400px] lg:min-h-screen bg-fsm-blue overflow-hidden"
      >
        <div className="absolute inset-0 hero-parallax">
          <Image 
            src="/img/banner30.jpg" 
            alt="FSM Experience" 
            fill 
            className="object-cover brightness-75 scale-110"
            priority
          />
        </div>
        
        {/* Abstract Overlays */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white/20 lg:to-transparent lg:bg-gradient-to-r lg:from-white lg:via-white/5 lg:to-transparent z-10"></div>
        
        {/* Floating Stat Card */}
        <div className="absolute bottom-12 left-12 right-12 lg:right-auto lg:left-[-100px] z-20">
          <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[3rem] shadow-premium border border-white/40 max-w-xs animate-float">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-fsm-red rounded-2xl flex items-center justify-center text-white font-black text-xl">
                24
              </div>
              <p className="text-xs font-black text-fsm-blue tracking-widest uppercase">Años de <br /> Trayectoria</p>
            </div>
            <p className="text-sm font-bold text-gray-500 leading-relaxed">
              Liderando la formación técnica en Soacha desde el año 2000.
            </p>
          </div>
        </div>

        {/* Cinematic Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-fsm-red/20 blur-[100px] rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 w-2 h-[40vh] bg-fsm-red/40 transform -skew-x-12 z-0"></div>
      </div>
    </section>
  );
};

export default Hero;
