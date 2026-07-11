import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import BentoPrograms from "@/components/home/BentoPrograms";
import CertificationSection from "@/components/home/CertificationSection";
import WhyUs from "@/components/home/WhyUs";
import Testimonials from "@/components/home/Testimonials";
import WhatsAppButton from "@/components/common/WhatsAppButton";

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
      href: p.href
    }));

  return (
    <main className="min-h-screen bg-white">
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
    </main>
  );
}
