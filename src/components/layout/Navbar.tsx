"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown, Phone, Mail, Facebook as FacebookIcon, Instagram as InstagramIcon, ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks: { name: string; href?: string; dropdown?: { name: string; href: string }[]; external?: boolean }[] = [
    { name: "INICIO", href: "/" },
    { 
      name: "INSTITUCIÓN", 
      dropdown: [
        { name: "Acerca de la FSM", href: "/institucion/acerca-de-fsm" },
        { name: "¿Por qué nosotros?", href: "/institucion/porque-nosotros" },
        { name: "Normatividad", href: "/institucion/normatividad" },
        { name: "Directorio", href: "/institucion/directorio" },
      ]
    },
    { name: "OFERTA ACADÉMICA", href: "/oferta-academica" },
    { 
      name: "COMUNIDAD", 
      dropdown: [
        { name: "Noticias y Eventos", href: "/noticias-y-eventos" },
        { name: "Galería", href: "/galeria" },
        { name: "Calendario Académico", href: "/calendario-academico" },
        { name: "Preguntas Frecuentes", href: "/preguntas-frecuentes" },
      ]
    },
    { name: "BLOG", href: "/blog" },
    { name: "CONTACTO", href: "/contacto" },
  ];

  const utilityLinks = [
    { name: "Inscripciones", href: "https://fundacionsanmateo.q10.com/Preinscripcion", color: "bg-fsm-red" },
    { name: "Pagos estudiantes", href: "https://portalpagos.davivienda.com/#/comercio/6023/FUNDACION%20SAN%20MATEO", color: "bg-fsm-red" },
    { name: "Campus virtual", href: "https://site2.q10.com/login?ReturnUrl=%2F&aplentId=21bfe857-977b-4057-b48c-55d9717d0dfe", color: "bg-fsm-red" },
    { name: "Solicitudes", href: "https://solicitudes.fundacionsanmateosoacha.edu.co/centro-de-solicitudes", color: "bg-fsm-red" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center p-4 md:p-6 pointer-events-none gap-2">
      {/* Utility Bar - Desktop Only */}
      <div className={cn(
        "hidden xl:flex items-center gap-2 pointer-events-auto transition-all duration-500",
        scrolled ? "opacity-0 -translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
      )}>
        {utilityLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "px-5 py-1.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase text-white transition-all hover:scale-110 hover:shadow-xl active:scale-95",
              link.color
            )}
          >
            {link.name}
          </a>
        ))}
      </div>

      <nav 
        className={cn(
          "pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-between px-6 md:px-8 py-3 md:py-4 rounded-full border shadow-premium",
          scrolled 
            ? "w-full max-w-6xl bg-white border-gray-100" 
            : "w-full max-w-7xl bg-white/90 border-gray-100/50"
        )}
      >
        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-3 group">
          <div className="relative w-12 h-12 md:w-16 md:h-16 transition-transform duration-500 group-hover:scale-110">
            <Image 
              src="/FSM.png" 
              alt="FSM Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <div className="hidden lg:flex flex-col justify-center">
            <p className="text-sm md:text-base font-black text-fsm-blue leading-none tracking-tighter">FUNDACIÓN</p>
            <p className="text-sm md:text-base font-black text-fsm-blue leading-none tracking-tighter">SAN MATEO</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden xl:flex items-center gap-1">
          {navLinks.map((link) => (
            <div 
              key={link.name} 
              className="relative"
              onMouseEnter={() => setActiveDropdown(link.name)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link 
                href={link.href || "#"} 
                target={link.external ? "_blank" : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-[11px] font-black tracking-widest transition-all rounded-full hover:bg-fsm-blue/5",
                  activeDropdown === link.name ? "text-fsm-red" : "text-fsm-blue/80 hover:text-fsm-blue"
                )}
              >
                {link.name}
                {link.dropdown && <ChevronDown size={12} className={cn("transition-transform duration-300", activeDropdown === link.name && "rotate-180")} />}
              </Link>

              {/* Dropdown */}
              {link.dropdown && (
                <div 
                  className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 pt-4 transition-all duration-300 transform",
                    activeDropdown === link.name ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
                  )}
                >
                  <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-2xl min-w-[220px]">
                    <div className="flex flex-col gap-1">
                      {link.dropdown.map((item) => (
                        <Link 
                          key={item.name} 
                          href={item.href}
                          className="px-4 py-2.5 text-xs font-bold text-gray-800 hover:text-fsm-red hover:bg-fsm-red/5 rounded-xl transition-all"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 xl:hidden">
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2 text-fsm-blue hover:text-fsm-red transition-colors"
          >
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer (Fullscreen) */}
      <div 
        className={cn(
          "fixed inset-0 bg-fsm-blue z-[200] transition-all duration-700 pointer-events-auto",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
        )}
      >
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
        >
          <X size={48} />
        </button>

        <div className="h-full flex flex-col justify-center items-center p-8">
          <div className="flex flex-col gap-6 text-center">
            {/* Utility Links in Mobile */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {utilityLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase text-white transition-all active:scale-95",
                    link.color
                  )}
                >
                  {link.name}
                </a>
              ))}
            </div>

            {navLinks.map((link) => (
              <div key={link.name} className="group">
                {link.dropdown ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-fsm-red text-[10px] font-black tracking-[0.4em] uppercase">{link.name}</p>
                    <div className="flex flex-col gap-2">
                      {link.dropdown.map((item) => (
                        <Link 
                          key={item.name} 
                          href={item.href} 
                          onClick={() => setIsOpen(false)}
                          className="text-2xl md:text-3xl font-black text-white/70 hover:text-white hover:scale-105 transition-all"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link 
                    href={link.href || "#"} 
                    target={link.external ? "_blank" : undefined}
                    onClick={() => setIsOpen(false)}
                    className="text-3xl md:text-5xl font-black text-white hover:text-fsm-red transition-all inline-block hover:scale-105"
                  >
                    {link.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex gap-8 mt-16 text-white/30">
            <FacebookIcon size={32} className="hover:text-white transition-colors cursor-pointer" />
            <InstagramIcon size={32} className="hover:text-white transition-colors cursor-pointer" />
            <Mail size={32} className="hover:text-white transition-colors cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
