"use client";

import React from "react";
import { Facebook, MessageCircle, Link2, Twitter } from "lucide-react";
import toast from "react-hot-toast";

interface ShareButtonsProps {
  title: string;
  url: string;
}

const ShareButtons = ({ title, url }: ShareButtonsProps) => {
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${url}` : url;
  
  const handleShare = (platform: string) => {
    let shareLink = "";
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);

    switch (platform) {
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "whatsapp":
        shareLink = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
        break;
      case "copy":
        navigator.clipboard.writeText(shareUrl);
        toast.success("Enlace copiado al portapapeles");
        return;
    }

    if (shareLink) {
      window.open(shareLink, "_blank", "width=600,height=400");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-6 pt-6 border-t border-gray-100">
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-2">Compartir:</span>
      <button 
        onClick={() => handleShare("facebook")}
        className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm"
        title="Compartir en Facebook"
      >
        <Facebook size={14} />
      </button>
      <button 
        onClick={() => handleShare("whatsapp")}
        className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-600 hover:text-white transition-all shadow-sm"
        title="Compartir por WhatsApp"
      >
        <MessageCircle size={14} />
      </button>
      <button 
        onClick={() => handleShare("twitter")}
        className="p-2 bg-sky-50 text-sky-600 rounded-full hover:bg-sky-600 hover:text-white transition-all shadow-sm"
        title="Compartir en X"
      >
        <Twitter size={14} />
      </button>
      <button 
        onClick={() => handleShare("copy")}
        className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-800 hover:text-white transition-all shadow-sm"
        title="Copiar Enlace"
      >
        <Link2 size={14} />
      </button>
    </div>
  );
};

export default ShareButtons;
