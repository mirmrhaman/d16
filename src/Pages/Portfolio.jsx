import React, { useState } from "react";
import { projectsClient } from "@/api/projectsClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Maximize } from "lucide-react";

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsClient.list()
  });

  const filteredProjects = activeCategory === "all" 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

  const categories = [
    { value: "all", label: "All Projects" },
    { value: "residential", label: "Residential" },
    { value: "commercial", label: "Commercial" },
    { value: "restaurant_cafe", label: "Restaurant & Cafe" },
    { value: "other", label: "Other" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold mb-4"
            >
              Our Portfolio
            </motion.h1>
          <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-200"
            >
              Our portfolio highlights our experience across a wide range of residential and commercial projects. With a strong focus on quality, sustainability, and modern solutions, we deliver designs that adapt to different needs while maintaining a high standard of excellence.
            </motion.p>
          </div>
        </div>
      </div>

      <section className="py-12 md:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-5">Our Portfolio</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              Our residential portfolio spans everything from budget-friendly homes to luxury villas and duplexes, each designed with practical planning and timeless character.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              On the commercial side, we have delivered impactful spaces for offices, hotels, restaurants, and corporate environments with consistent execution quality and adaptive modern design.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-transparent">
              {categories.map((cat) => (
                <TabsTrigger 
                  key={cat.value} 
                  value={cat.value}
                  className="data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white px-6 py-2"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No projects available in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                    <div className="relative h-72 overflow-hidden">
                      <img 
                        src={project.featured_image} 
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold text-[var(--primary)] mb-3">{project.title}</h3>
                      
                      <div className="space-y-2 mb-4">
                        {project.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin size={16} className="mr-2 text-[var(--accent)]" />
                            <span>{project.location}</span>
                          </div>
                        )}
                        {project.area && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Maximize size={16} className="mr-2 text-[var(--accent)]" />
                            <span>{project.area}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.project_type && (
                          <Badge variant="outline" className="border-[var(--primary)] text-[var(--primary)]">
                            {project.project_type}
                          </Badge>
                        )}
                        {project.style && (
                          <Badge variant="outline" className="border-[var(--accent)] text-[var(--accent)]">
                            {project.style}
                          </Badge>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-gray-600 text-sm line-clamp-3">{project.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}