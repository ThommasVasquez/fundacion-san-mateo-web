import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import BentoPrograms from "@/components/home/BentoPrograms";
import CertificationSection from "@/components/home/CertificationSection";
import WhyUs from "@/components/home/WhyUs";
import Testimonials from "@/components/home/Testimonials";
import WhatsAppButton from "@/components/common/WhatsAppButton";

import { getContentMap } from "@/lib/content";

export default async function Home() {
  const content = await getContentMap('/');
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <Hero content={content} />
      
      {/* Immersive Structural Break: The Bento Grid */}
      <BentoPrograms content={content} />
      
      {/* Elegant Integration of Trust */}
      <CertificationSection content={content} />
      
      {/* Storytelling Immersive Section */}
      <WhyUs />
      
      {/* Social Proof */}
      <div className="bg-fsm-blue py-32">
        <Testimonials />
      </div>
      
      <Footer />
      
      <WhatsAppButton />
    </main>
  );
}
