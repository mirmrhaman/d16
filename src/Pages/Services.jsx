import React from "react";
import { servicesClient } from "@/api/servicesClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const serviceCategories = [
  "Home Interior Design",
  "Duplex Interior Design",
  "Corporate Office Interior",
  "Restaurant & Cafe Interior",
  "Resort Interior",
  "Brand Showroom Interior",
  "Saloon Interior",
  "Parlour & Spa Interior",
  "Gym Interior",
  "Hospital & Clinic Interior",
  "Dental Chamber Interior",
  "Pharmacy Interior",
  "Retail Shop Interior",
  "Educational Institute Interior",
  "Hotel & Hospitality Interior",
  "Kids Play Zone Interior",
  "Convention Center Interior",
  "Furniture Design"
];

const capabilityPillars = [
  {
    title: "Interior Design",
    description: "Tailored design concepts for residential and commercial spaces with balanced aesthetics and usability."
  },
  {
    title: "Custom Furniture & Fixtures",
    description: "Purpose-built furniture and fixtures crafted to fit your layout, style, and long-term durability goals."
  },
  {
    title: "Space Planning & Layout",
    description: "Smart zoning and circulation planning that improves comfort, flow, and day-to-day functionality."
  },
  {
    title: "Project Management",
    description: "End-to-end coordination of vendors, materials, schedule, and execution quality from start to handover."
  },
  {
    title: "Sustainable & Innovative Solutions",
    description: "Energy-conscious materials and thoughtful design decisions that reduce waste and elevate performance."
  },
  {
    title: "Consultation & Styling",
    description: "Professional consultation and finishing support to refine every detail and complete your desired look."
  }
];

export default function Services() {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesClient.list()
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80"
          alt="Design Services"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/80 to-[var(--primary)]/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold mb-4"
            >
              Design Services
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl"
            >
              Visionary design. Stylish spaces. Your destination.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <img 
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80"
                alt="Interior Design"
                className="rounded-2xl shadow-2xl"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-6">
                Comprehensive Interior Design Services
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Across Bangladesh, our comprehensive interior design services encompass the full spectrum of 
                residential and commercial projects, including custom homes, offices, restaurants, renovations, 
                and bespoke furniture.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                From sign-up to handover, D16 Interior stands by your side, ensuring a seamless and professional 
                interior design process. It's time to create a space that speaks YOUR language, something that imbibes YOU.
              </p>
              <Link to={createPageUrl("Contact")}>
                <Button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-8 py-6 text-lg">
                  Contact Us
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              Complete Service Categories
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We deliver specialized interior solutions across all major residential, hospitality, healthcare, retail, and commercial sectors.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceCategories.map((category, index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                viewport={{ once: true }}
                className="rounded-xl border border-[var(--accent-light)] bg-white px-4 py-3 text-[var(--primary)] font-medium"
              >
                {index + 1}. {category}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-gradient-to-br from-white to-[var(--accent-light)]/55">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              Our Services
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our six core capabilities combine strategy, design excellence, and practical execution for every project type.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilityPillars.map((pillar, index) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-[var(--accent-light)] bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-bold text-[var(--primary)] mb-3">{pillar.title}</h3>
                <p className="text-gray-600 leading-relaxed">{pillar.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              Why Partner with Us?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Designing spaces that seamlessly blend style, luxury, and functionality is our expertise.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No services available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                >
                  {service.image && (
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={service.image} 
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-[var(--primary)] mb-3">{service.title}</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">{service.description}</p>
                    {service.features && service.features.length > 0 && (
                      <ul className="space-y-2 mb-4">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-600">
                            <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full mr-2"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center text-[var(--accent)] font-semibold group-hover:translate-x-2 transition-transform">
                      Learn More <ArrowRight className="ml-2" size={18} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Let your Interiors make you shine in their own way
          </h2>
          <p className="text-xl mb-8 text-gray-200">
            Contact us today for the perfect interiors!
          </p>
          <Link to={createPageUrl("Contact")}>
            <Button size="lg" className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold px-8 py-6 text-lg">
              Book Consultation
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}