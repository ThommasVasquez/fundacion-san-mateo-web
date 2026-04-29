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
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
  const [visibleCount, setVisibleCount] = useState(12);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Removed buggy GSAP ScrollTrigger for gallery items
      // Images will now load natively without opacity blocks
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
              <span className="text-fsm-red uppercase">Experiencia</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed">
              Un recorrido visual por las prácticas, eventos y momentos que definen nuestra excelencia educativa en la Fundación San Mateo.
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden">
          <Image src="/img/banner10.jpg" alt="Galería FSM" fill className="object-cover scale-110" priority />
        </div>
      </section>

      <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-300 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">Galería fotográfica</span>
        </div>

        {/* Bento Grid Gallery - Pure Color Mode */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8 auto-rows-[250px] md:auto-rows-[300px]">
          {galleryItems.slice(0, visibleCount).map((item) => (
            <div 
              key={item.id}
              onClick={() => openLightbox(item.id)}
              className={cn(
                "gallery-item group relative rounded-[2.5rem] overflow-hidden cursor-pointer hover:z-10",
                item.span
              )}
            >
              <img 
                src={item.thumb} 
                alt={`Galería FSM ${item.id}`} 
                className="object-cover w-full h-full transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="p-4 bg-fsm-red text-white rounded-full shadow-xl">
                  <Maximize2 size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {visibleCount < galleryItems.length && (
          <div className="mt-16 flex justify-center">
            <button 
              onClick={() => setVisibleCount(prev => Math.min(prev + 12, galleryItems.length))}
              className="bg-gray-50 border border-gray-100 text-fsm-blue hover:text-fsm-red hover:bg-fsm-red/5 px-10 py-4 rounded-full font-black text-xs tracking-widest uppercase transition-all duration-300 shadow-sm"
            >
              Cargar más fotos
            </button>
          </div>
        )}
      </div>

      {/* Modern Lightbox - Pure Dark Mode */}
      {selectedImage !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 animate-in duration-300">
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
              <img 
                src={galleryItems[selectedImage - 1].full} 
                alt={`FSM Full Image ${selectedImage}`}
                className="object-contain w-full h-full"
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
