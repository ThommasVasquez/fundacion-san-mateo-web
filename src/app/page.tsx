import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import BentoPrograms from "@/components/home/BentoPrograms";
import CertificationSection from "@/components/home/CertificationSection";
import WhyUs from "@/components/home/WhyUs";
import Testimonials from "@/components/home/Testimonials";
import WhatsAppButton from "@/components/common/WhatsAppButton";
import FloatingLandingModal from "@/components/common/FloatingLandingModal";

import { getContentMap, getTestimonials, getPrograms } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getContentMap('/');
  const testimonials = await getTestimonials();
  const programs = await getPrograms();
  
  // Filter and format featured programs for the Bento grid
  const featuredPrograms = programs
    .filter((p: any) => p.is_featured)
    .map((p: any) => ({
      id: p.id.toString(),
      title: p.title,
      subtitle: p.subtitle || '',
      image_url: p.image_url,
      href: p.href,
      details: p.details || {}
    }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "name": "Fundación San Mateo",
    "alternateName": "Institución de Educación para el Trabajo y Desarrollo Humano San Mateo Soacha",
    "url": "https://fundacionsanmateosoacha.edu.co",
    "logo": "https://fundacionsanmateosoacha.edu.co/FSM.png",
    "image": "https://fundacionsanmateosoacha.edu.co/og-image.png",
    "description": "Institución de Educación para el Trabajo y Desarrollo Humano en Soacha certificada en Calidad ISO 9001 y NTC. Programas Técnicos en Auxiliar de Enfermería y Primera Infancia.",
    "telephone": "+576017812345",
    "priceRange": "$$",
    "currenciesAccepted": "COP",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Soacha",
      "addressRegion": "Cundinamarca",
      "addressCountry": "CO"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 4.5794,
      "longitude": -74.2169
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "07:00",
        "closes": "18:00"
      }
    ],
    "sameAs": [
      "https://www.facebook.com/fundacionsanmateosoacha",
      "https://www.instagram.com/fundacionsanmateosoacha",
      "https://www.youtube.com/channel/UCYjqvqqCoWdNI_pL-6Z37jg"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Programas Técnicos Laborales",
      "itemListElement": [
        {
          "@type": "EducationalOccupationalProgram",
          "name": "Técnico Laboral Auxiliar de Enfermería",
          "educationalProgramMode": "Presencial",
          "occupationalCategory": "Salud",
          "url": "https://fundacionsanmateosoacha.edu.co/programa-enfermeria"
        },
        {
          "@type": "EducationalOccupationalProgram",
          "name": "Técnico Laboral en Atención a la Primera Infancia",
          "educationalProgramMode": "Presencial",
          "occupationalCategory": "Educación",
          "url": "https://fundacionsanmateosoacha.edu.co/programa-primera-infancia"
        }
      ]
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      
      {/* Hero Section */}
      <Hero content={content} />
      
      {/* Immersive Structural Break: The Bento Grid */}
      <BentoPrograms content={content} programs={featuredPrograms} />
      
      {/* Elegant Integration of Trust */}
      <CertificationSection content={content} />
      
      {/* Storytelling Immersive Section */}
      <WhyUs content={content} />
      
      {/* Social Proof */}
      <div className="bg-fsm-blue py-32">
        <Testimonials content={content} data={testimonials} />
      </div>
      
      <Footer />
      
      <WhatsAppButton />

      <FloatingLandingModal 
        showModal={content['home_landing_modal_show'] !== 'false'}
        link={content['home_landing_modal_link'] || 'https://fundacionsanmateosoacha.escalapages.com/empoderamiento-formulario-con-1-campo'}
        image={content['home_landing_modal_image']}
        buttonText={content['home_landing_modal_text'] || '¡Inscríbete Hoy Mismo!'}
      />
    </main>
  );
}
