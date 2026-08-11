import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Video, Palette, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Gallery() {
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Fetch videos from base44
  const { data: videos = [] } = useQuery({
    queryKey: ['galleryVideos'],
    queryFn: () => base44.entities.GalleryVideo.list('id')
  });

  // Fetch concepts from base44
  const { data: concepts = [] } = useQuery({
    queryKey: ['galleryConcepts'],
    queryFn: () => base44.entities.GalleryConcept.list('order')
  });

  const handleConceptSelect = (conceptId) => {
    setSelectedConcept(conceptId);
  };

  const handleSubmitConcept = () => {
    if (selectedConcept) {
      setShowThankYou(true);
      setTimeout(() => {
        setShowThankYou(false);
        setSelectedConcept(null);
      }, 5000);
    }
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
  };

  // Helper to check if URL is YouTube
  const isYouTubeUrl = (url) => {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
  };

  // Get YouTube embed URL
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be')) {
      // Handle youtu.be URLs - extract ID before query params
      const parts = url.split('/');
      videoId = parts[parts.length - 1].split('?')[0];
    } else if (url.includes('youtube.com')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={closeVideoModal}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeVideoModal}
                className="absolute -top-10 right-0 text-white hover:text-gray-300"
              >
                <X size={32} />
              </button>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {selectedVideo.video_url ? (
                  isYouTubeUrl(selectedVideo.video_url) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(selectedVideo.video_url)}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={selectedVideo.video_url}
                      controls
                      autoPlay
                      className="w-full h-full"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <p>No video URL provided</p>
                  </div>
                )}
              </div>
              <div className="mt-4 text-white">
                <h3 className="text-xl font-bold">{selectedVideo.title}</h3>
                <p className="text-gray-300">{selectedVideo.category}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold mb-4"
            >
              Our Gallery
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-200"
            >
              Explore our projects and find inspiration for your space
            </motion.p>
          </div>
        </div>
      </div>

      {/* Videos Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center mb-12"
          >
            <Video className="text-[var(--accent)] mr-3" size={32} />
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)]">
              Project Videos
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
                onClick={() => handleVideoClick(video)}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="text-[var(--primary)] ml-1" size={32} />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-sm px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <p className="text-sm text-[var(--accent)] font-medium mb-1">{video.category}</p>
                    <h3 className="font-semibold text-[var(--primary)]">{video.title}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pick Your Concept Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-4">
              <Palette className="text-[var(--accent)] mr-3" size={32} />
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)]">
                Pick Your Concept
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Select a design style that resonates with your preferences, and we'll help bring your vision to life
            </p>
          </motion.div>

          {showThankYou ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 bg-white rounded-2xl shadow-lg"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="text-green-600" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-[var(--primary)] mb-2">Thank You!</h3>
              <p className="text-gray-600">Our team will contact you shortly to discuss your chosen concept.</p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {concepts.map((concept, index) => (
                  <motion.div
                    key={concept.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className={`cursor-pointer rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
                      selectedConcept === concept.id 
                        ? 'ring-4 ring-[var(--accent)] scale-105' 
                        : 'hover:shadow-2xl hover:-translate-y-2'
                    }`}
                    onClick={() => handleConceptSelect(concept.id)}
                  >
                    <div className="relative h-48">
                      <img 
                        src={concept.image} 
                        alt={concept.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="text-xl font-bold">{concept.title}</h3>
                        <p className="text-sm text-gray-200">{concept.description}</p>
                      </div>
                      {selectedConcept === concept.id && (
                        <div className="absolute top-3 right-3 w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center">
                          <Check className="text-white" size={18} />
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-white">
                      <ul className="space-y-2">
                        {concept.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-600">
                            <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full mr-2"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="text-center">
                <Button
                  onClick={handleSubmitConcept}
                  disabled={!selectedConcept}
                  className={`px-8 py-6 text-lg ${
                    selectedConcept 
                      ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit Your Choice
                  <ArrowRight className="ml-2" size={20} />
                </Button>
                {!selectedConcept && (
                  <p className="text-gray-500 mt-2">Please select a concept to continue</p>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Space?
          </h2>
          <p className="text-xl mb-8 text-gray-200">
            Contact us today for a free consultation and let's bring your vision to life
          </p>
          <Button size="lg" className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold px-8 py-6 text-lg">
            Get Started
          </Button>
        </div>
      </section>
    </div>
  );
}

