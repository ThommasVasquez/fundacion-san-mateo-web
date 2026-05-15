"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, X, ChevronLeft, Maximize2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GalleryItem {
  id: string;
  image_url: string;
  thumb_url: string;
  span_class: string;
}

interface GalleryContentProps {
  galleryItems: GalleryItem[];
  content: Record<string, string>;
}

export default function GalleryContent({ galleryItems, content }: GalleryContentProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animations for gallery reveal
      gsap.utils.toArray(".gallery-item").forEach((el: any) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none"
          },
          y: 50,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out"
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, [visibleCount]);

  const openLightbox = (index: number) => setSelectedImageIndex(index);
  const closeLightbox = () => setSelectedImageIndex(null);
  const nextImage = () => setSelectedImageIndex(prev => prev === null ? null : (prev + 1) % galleryItems.length);
  const prevImage = () => setSelectedImageIndex(prev => prev === null ? null : (prev === 0 ? galleryItems.length - 1 : prev - 1));

  return (
    <div ref={containerRef} className="container mx-auto px-8 py-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase text-gray-800 mb-20">
          <Link href="/" className="hover:text-fsm-red transition-colors">Inicio</Link>
          <ChevronRight size={14} className="text-fsm-red" />
          <span className="text-fsm-blue">{content.gallery_breadcrumbs_label || "Galería fotográfica"}</span>
        </div>

        {/* Bento Grid Gallery */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8 auto-rows-[250px] md:auto-rows-[300px]">
          {galleryItems.slice(0, visibleCount).map((item, index) => (
            <div 
              key={item.id}
              onClick={() => openLightbox(index)}
              className={cn(
                "gallery-item group relative rounded-[2.5rem] overflow-hidden cursor-pointer hover:z-10 bg-gray-50",
                item.span_class || "col-span-1 row-span-1"
              )}
            >
              <Image 
                src={item.thumb_url || item.image_url} 
                alt="Galería FSM" 
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-fsm-blue/20">
                <div className="p-4 bg-fsm-red text-white rounded-full shadow-xl transform scale-50 group-hover:scale-100 transition-transform duration-500">
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
              {content.gallery_load_more_text || "Cargar más fotos"}
            </button>
          </div>
        )}

        {/* Modern Lightbox */}
        {selectedImageIndex !== null && (
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
                        <Image 
                        src={galleryItems[selectedImageIndex].image_url} 
                        alt={`FSM Gallery Image ${selectedImageIndex + 1}`}
                        fill
                        className="object-contain"
                        priority
                        />
                    </div>
                    <div className="mt-12">
                        <span className="text-white/20 font-black text-2xl tracking-[0.8em] uppercase">
                        {(selectedImageIndex + 1).toString().padStart(2, '0')} / {galleryItems.length.toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>
            </div>
        )}
      </div>
  );
}
