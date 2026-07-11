import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { getContentMap, getNewsEvents } from "@/lib/content";
import NewsContent from "./NewsContent";

export const metadata = {
  title: "Noticias y Eventos | Fundación San Mateo",
  description: "Manténgase al día con los logros, celebraciones y anuncios más importantes de nuestra comunidad académica.",
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const content = await getContentMap("/noticias-y-eventos");
  const rawNews = await getNewsEvents();

  const news = rawNews.map((item: any) => ({
    id: item.id.toString(),
    title: item.title,
    description: item.description || '',
    image_url: item.image_url || '',
    date_text: item.date_text || '',
    category: item.category || '',
    link: item.link || ''
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
                {content.news_magazine_label || "Magazine Institucional"}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-fsm-blue leading-none mb-8">
              {content.news_title_1 || "NOTICIAS Y"} <br />
              <span className="text-fsm-red uppercase">{content.news_title_2 || "Eventos"}</span>
            </h1>
            <p className="text-lg text-gray-700 font-medium leading-relaxed">
              {content.news_description || "Manténgase al día con los logros, celebraciones y anuncios más importantes de nuestra comunidad académica."}
            </p>
          </div>
        </div>
        <div className="lg:w-1/2 relative min-h-[300px] lg:min-h-full overflow-hidden bg-fsm-blue">
          <Image 
            src={content.news_hero_image || "/img/banner14.jpg"} 
            alt="Noticias FSM" 
            fill 
            className="object-cover scale-110 brightness-75" 
            priority 
          />
          <div className="absolute bottom-12 right-12 z-20 bg-white/10 p-6 rounded-[2.5rem] border border-white/20">
             <Newspaper className="text-white opacity-50" size={32} />
          </div>
        </div>
      </section>

      <NewsContent news={news} content={content} />

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
