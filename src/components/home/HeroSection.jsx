import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Residence Interior Design",
      subtitle: "Crafting warm, stylish homes that reflect who you are",
      image: "/images/hero-residence.jpg"
    },
    {
      title: "Commercial Space Interior Design",
      subtitle: "Where brand identity meets modern interior excellence",
      image: "/images/hero-commercial.jpg"
    },
    {
      title: "Curated Furniture & Decor",
      subtitle: "Furniture & Decor that Speaks Your Style",
      image: "/images/hero-furniture.jpg"
    }
  ];

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="relative h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
          />
          {/* Removed blue gradient overlay - images now display clearly */}
          
          <div className="relative h-full flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="max-w-3xl"
              >
                <motion.h1 
                  className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  {slides[currentSlide].title}
                </motion.h1>
                <motion.p 
                  className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                >
                  {slides[currentSlide].subtitle}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.82, duration: 0.7 }}
                  className="mb-8"
                >
                  <motion.div
                    className="inline-flex items-center rounded-full px-5 py-2 bg-[var(--primary-dark)]/75 border border-white/35 backdrop-blur-sm"
                    animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className="text-white text-base md:text-lg font-semibold tracking-wide">
                      Where <span className="text-[var(--accent)]">Space</span> meets <span className="text-[var(--accent)]">Style</span>
                    </span>
                  </motion.div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                >
                  <Link to={createPageUrl("Contact")}>
                    <Button 
                      size="lg" 
                      className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold px-8 py-6 text-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                    >
                      Book Consultation
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300"
          >
            <ChevronLeft className="text-white" size={28} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300"
          >
            <ChevronRight className="text-white" size={28} />
          </button>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex space-x-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-12 bg-[var(--accent)]' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}