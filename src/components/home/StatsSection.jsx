import React from "react";
import { motion } from "framer-motion";
import { Award, Users, TrendingUp, Star, Target, Briefcase } from "lucide-react";
import { statsClient } from "@/api/statsClient";
import { useQuery } from "@tanstack/react-query";

const iconMap = {
  Award, Users, TrendingUp, Star, Target, Briefcase
};

export default function StatsSection() {
  const { data: stats = [] } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsClient.list()
  });

  if (stats.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Excellence in Architecture
          </h2>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
            At D16 Interior, we are dedicated to providing exceptional architectural and interior design services. 
            Our expertise allows us to transform spaces into stunning environments that reflect your unique vision.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => {
            const Icon = iconMap[stat.icon] || Award;
            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 hover-lift"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--accent)] rounded-full mb-6">
                  <Icon className="text-white" size={32} />
                </div>
                <h3 className="text-5xl font-bold text-white mb-3">{stat.value}</h3>
                <p className="text-lg text-gray-200">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}