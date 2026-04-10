"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, X, ChevronLeft, Maximize2, Camera } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import gsap from "gsap";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generating 92 gallery items
const galleryItems = Array.from({ length: 92 }, (_, i) => ({
  id: i + 1,
  thumb: `/img/gal/thumb-gal${i + 1}.jpg`,
  full: `/img/gal/gal${i + 1}.jpg`,
  // Add some metadata for variety
  span: (i % 7 === 0) ? "md:col-span-2 md:row-span-2" : (i % 10 === 0) ? "md:col-span-2 md:row-span-1" : "col-span-1 row-span-1"
}));

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".gallery-item", {
        scale: 0.9,
        opacity: 0,
        duration: 0.8,
        stagger: {
          each: 0.05,
          grid: "auto",
        },
        ease: "power2.out"
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const openLightbox = (id: number) => setSelectedImage(id);
  const closeLightbox = () => setSelectedImage(null);
  const nextImage = () => setSelectedImage(prev => prev === null ? null : (prev % 92) + 1);
  const prevImage = () => setSelectedImage(prev => prev === null ? null : (prev === 1 ? 92 : prev - 1));

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Cinematic Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden">
        <div className="lg:w-1/2 flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">Comunidad FSM</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              NUESTRA <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fsm-red to-fsm-red-deep uppercase">Experiencia</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Un recorrido visual por las prácticas, eventos y momentos que definen nuestra excelencia educativa en la Fundación San Mateo.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden">
          <Image src="/img/banner10.jpg" alt="Galería FSM" fill className="object-cover scale-110 brightness-75" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-white lg:via-white/20 to-transparent z-10"></div>
          {/* Decorative element */}
          <div className="absolute bottom-12 right-12 z-20 bg-white/10 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20">
             <Camera className="text-white opacity-50" size={32} />
          </div>
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Galería fotográfica</span>
        </div>

        {/* Bento Grid Gallery */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8 auto-rows-[250px] md:auto-rows-[300px]">
          {galleryItems.map((item) => (
            <div 
              key={item.id}
              onClick={() => openLightbox(item.id)}
              className={cn(
                "gallery-item group relative rounded-[2.5rem] overflow-hidden bg-gray-50 cursor-pointer shadow-premium border border-gray-100 transition-all duration-700 hover:z-10",
                item.span
              )}
            >
              <Image 
                src={item.thumb} 
                alt={`Galería FSM ${item.id}`} 
                fill 
                className="object-cover transition-transform duration-1000 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-80 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-fsm-blue/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-12">
                <div className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 transform translate-y-8 group-hover:translate-y-0 transition-all duration-700">
                  <Maximize2 className="text-white" size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Lightbox */}
      {selectedImage !== null && (
        <div className="fixed inset-0 z-[100] bg-fsm-blue/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-500">
          <button 
            onClick={closeLightbox}
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-all transform hover:rotate-90 z-[110]"
          >
            <X size={48} />
          </button>

          <button 
            onClick={prevImage}
            className="absolute left-4 md:left-8 text-white/30 hover:text-white transition-all z-[110] p-6 rounded-full hover:bg-white/10"
          >
            <ChevronLeft size={48} />
          </button>

          <button 
            onClick={nextImage}
            className="absolute right-4 md:right-8 text-white/30 hover:text-white transition-all z-[110] p-6 rounded-full hover:bg-white/10"
          >
            <ChevronRight size={48} />
          </button>

          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <div className="relative w-full h-full max-w-6xl max-h-[75vh] rounded-[4rem] overflow-hidden shadow-premium border border-white/10">
              <Image 
                src={galleryItems[selectedImage - 1].full} 
                alt={`FSM Full Image ${selectedImage}`}
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="mt-12">
               <span className="text-white/20 font-black text-2xl tracking-[0.8em] uppercase">
                {selectedImage.toString().padStart(2, '0')} / 92
               </span>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
