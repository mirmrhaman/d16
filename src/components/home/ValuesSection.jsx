import React from "react";
import { motion } from "framer-motion";
import { UserCheck, PiggyBank, Target, Clock } from "lucide-react";

const values = [
  {
    icon: UserCheck,
    title: "Personalized Design Approach",
    description: "We tailor every project to reflect your unique style, preferences, and lifestyle, creating spaces that truly feel like home."
  },
  {
    icon: PiggyBank,
    title: "Practical & Budget-Friendly Solutions",
    description: "We work within your budget to deliver stunning interiors without compromising on quality or functionality."
  },
  {
    icon: Target,
    title: "Detail-Oriented & Style-Driven",
    description: "Every detail matters to us. We pay meticulous attention to aesthetics, materials, and finishing touches."
  },
  {
    icon: Clock,
    title: "On-Time Project Delivery",
    description: "We understand the importance of timelines. Our efficient process ensures your project is completed on schedule."
  }
];

export default function ValuesSection() {
  return (
    <section className="relative overflow-hidden py-20 bg-[var(--primary-dark)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[var(--accent)]/20 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
            Why Choose D16 Interior
          </h2>
          <p className="text-lg text-slate-200 max-w-2xl mx-auto">
            We are committed to delivering exceptional interior design solutions that exceed your expectations
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              viewport={{ once: true }}
              className="group rounded-2xl p-8 text-center border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/15 transition-all duration-300 hover:-translate-y-2"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-6 shadow-lg group-hover:scale-105 transition-transform duration-300">
                <value.icon className="text-[var(--primary-dark)]" size={30} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
              <p className="text-slate-200 leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

