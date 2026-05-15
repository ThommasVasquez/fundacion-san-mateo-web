import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import { Camera } from "lucide-react";
import { getContentMap, getGallery } from "@/lib/content";
import GalleryContent from "./GalleryContent";

export const metadata = {
  title: "Galería de Momentos | Fundación San Mateo",
  description: "Un recorrido visual por las prácticas, eventos y momentos que definen nuestra excelencia educativa.",
};

export default async function GalleryPage() {
  const content = await getContentMap("/galeria");
  const rawGallery = await getGallery();

  const galleryItems = rawGallery.map((item: any) => ({
    id: item.id.toString(),
    image_url: item.image_url,
    thumb_url: item.thumb_url || item.image_url,
    span_class: item.span_class || 'col-span-1 row-span-1'
  }));

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Cinematic Header - Split Screen */}
      <section className="relative min-h-[60vh] flex flex-col lg:flex-row pt-24 overflow-hidden">
        <div className="lg:w-1/2 flex items-center px-8 md:px-20 py-20 bg-white relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-fsm-red"></span>
              <span className="text-[10px] font-black tracking-[0.4em] text-fsm-red uppercase">
                {content.gallery_hero_subtitle || "Comunidad FSM"}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              {content.gallery_hero_title1 || "NUESTRA"} <br />
              <span className="text-fsm-red uppercase">{content.gallery_hero_title2 || "Experiencia"}</span>
            </h1>
            <p className="text-lg text-gray-700 font-medium leading-relaxed">
              {content.gallery_hero_description || "Un recorrido visual por las prácticas, eventos y momentos que definen nuestra excelencia educativa en la Fundación San Mateo."}
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image 
            src={content.gallery_hero_image || "/img/banner10.jpg"} 
            alt="Galería FSM" 
            fill 
            className="object-cover scale-110 brightness-90" 
            priority 
          />
          <div className="absolute bottom-12 right-12 z-20 bg-white/10 p-6 rounded-[2.5rem] border border-white/20 backdrop-blur-md">
             <Camera className="text-white opacity-50" size={32} />
          </div>
        </div>
      </section>

      <GalleryContent galleryItems={galleryItems} content={content} />

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
