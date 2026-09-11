import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const baseUrl = import.meta.env.BASE_URL;

  const defaultSlides = [
    {
      title: "Residence Interior Design",
      subtitle: "Crafting warm, stylish homes that reflect who you are",
      image: `${baseUrl}images/hero-residence.jpg`
    },
    {
      title: "Commercial Space Interior Design",
      subtitle: "Where brand identity meets modern interior excellence",
      image: `${baseUrl}images/hero-commercial.jpg`
    },
    {
      title: "Curated Furniture & Decor",
      subtitle: "Furniture & Decor that Speaks Your Style",
      image: `${baseUrl}images/hero-furniture.jpg`
    }
  ];

  const { data: savedSlides, isLoading } = useQuery({ queryKey: ["heroSlides", "public"], queryFn: () => base44.entities.HeroSlide.list("order") });
  const visibleSlides = useMemo(() => savedSlides?.filter((slide) => slide.active !== false && slide.active !== 0), [savedSlides]);
  const slides = savedSlides ? visibleSlides : defaultSlides;
  const slideIndex = slides.length ? currentSlide % slides.length : 0;

  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length, paused, reducedMotion]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  if (savedSlides && slides.length === 0) return <section className="flex min-h-[60vh] items-center justify-center bg-[var(--primary)] px-6 text-center text-white"><div><h1 className="mb-5 text-4xl font-bold">Where Space meets Style</h1><p className="mb-8 text-lg">Thoughtful interior design, shaped around you.</p><Link to={createPageUrl("Contact")} className="inline-block rounded-md bg-[var(--accent)] px-7 py-4 font-semibold">Book Consultation</Link></div></section>;

  return (
    <div className="relative h-[calc(100svh-5rem)] min-h-[38rem] overflow-hidden md:min-h-[40rem]" role="region" aria-roledescription="carousel" aria-label="Featured interior design" aria-busy={isLoading}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slideIndex}
          initial={reducedMotion ? false : { opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 1, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slides[slideIndex].image})` }}
          />
          {/* Removed blue gradient overlay - images now display clearly */}
          
          <div className="relative h-full flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="max-w-3xl px-8 sm:px-10"
              >
                <motion.h1 
                  className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.65)]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  {slides[slideIndex].title}
                </motion.h1>
                <motion.p 
                  className="text-lg md:text-2xl text-white mb-8 leading-relaxed [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                >
                  {slides[slideIndex].subtitle}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.82, duration: 0.7 }}
                  className="mb-8"
                >
                  <motion.div
                    className="inline-flex items-center rounded-full px-5 py-2 bg-[var(--primary-dark)]/75 border border-white/35 backdrop-blur-sm"
                    animate={reducedMotion ? {} : { scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
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
            type="button"
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300"
          >
            <ChevronLeft className="text-white" size={28} />
          </button>
          <button
            onClick={nextSlide}
            type="button"
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300"
          >
            <ChevronRight className="text-white" size={28} />
          </button>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex space-x-3">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show slide ${index + 1}: ${slides[index].title}`}
                aria-current={index === slideIndex ? "true" : undefined}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === slideIndex ? 'w-12 bg-[var(--accent)]' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>
          {!reducedMotion && <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play slideshow" : "Pause slideshow"} className="absolute bottom-5 right-5 z-10 rounded-full bg-black/40 p-3 text-white backdrop-blur-sm">{paused ? <Play size={20} /> : <Pause size={20} />}</button>}
        </>
      )}
    </div>
  );
}
