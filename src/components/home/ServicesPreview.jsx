import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { ArrowRight, Home, Building2, Coffee, Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Home,
    title: "Residential Architecture",
    description: "Transform your home into a stunning architectural masterpiece with bespoke designs that blend elegance and functionality.",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80"
  },
  {
    icon: Building2,
    title: "Commercial Architecture",
    description: "Professional architectural solutions for offices and commercial spaces that enhance productivity and brand identity.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
  },
  {
    icon: Coffee,
    title: "Hospitality Design",
    description: "Expert architectural planning for restaurants and cafes that create memorable customer experiences.",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80"
  },
  {
    icon: Hotel,
    title: "Mixed-Use Developments",
    description: "Comprehensive architectural solutions for hotels and mixed-use buildings that maximize functionality.",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80"
  }
];

export default function ServicesPreview() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--primary)' }}>
            Our Architectural Services
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Crafting Timeless Architecture – Unleashing Design Excellence across Bangladesh
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-2xl luxury-shadow hover-lift"
            >
              <div className="absolute inset-0">
                <img 
                  src={service.image} 
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary)]/90 via-[var(--primary)]/60 to-transparent" />
              </div>
              
              <div className="relative p-8 h-80 flex flex-col justify-end">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-[var(--accent)] rounded-full mb-4">
                  <service.icon className="text-white" size={28} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">{service.title}</h3>
                <p className="text-gray-200 mb-4 leading-relaxed">{service.description}</p>
                <div className="flex items-center text-[var(--accent)] font-semibold group-hover:translate-x-2 transition-transform duration-300">
                  Learn More <ArrowRight className="ml-2" size={20} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link to={createPageUrl("Services")}>
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all duration-300 px-8 py-6 text-lg"
            >
              View All Services
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}