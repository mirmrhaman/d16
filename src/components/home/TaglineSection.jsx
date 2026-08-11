import React from "react";
import { motion } from "framer-motion";

export default function TaglineSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-b from-white via-[var(--accent-light)]/45 to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[var(--primary-dark)]/10 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative text-center border border-[var(--accent-light)] rounded-3xl bg-white/80 backdrop-blur-sm px-6 py-10 md:px-10 md:py-14 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.25)]"
        >
          <motion.h2 
            className="text-4xl md:text-6xl font-bold mb-4"
            style={{ color: "var(--primary-dark)" }}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.span
              className="inline-block"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              Where
            </motion.span>{" "}
            <motion.span
              className="text-[var(--accent)] inline-block"
              animate={{ opacity: [0.65, 1, 0.65], scale: [1, 1.08, 1], x: [0, 6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              Space
            </motion.span>{" "}
            <motion.span
              className="inline-block"
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            >
              meets
            </motion.span>{" "}
            <motion.span
              className="text-[var(--accent)] inline-block"
              animate={{ opacity: [0.65, 1, 0.65], scale: [1, 1.1, 1], x: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              Style
            </motion.span>
          </motion.h2>
          <motion.div
            className="mx-auto mb-6 h-1 rounded-full bg-gradient-to-r from-[var(--accent)] via-[var(--primary-dark)] to-[var(--accent)]"
            style={{ maxWidth: 320 }}
            animate={{ scaleX: [0.8, 1.15, 0.8], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.p 
            className="text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            viewport={{ once: true }}
          >
            At D16 Interior, your space and style come together effortlessly, forming a truly unique environment. 
            We specialize in transforming spaces with modern, functional, and breathtaking design, making every 
            corner not just beautiful, but also practical and comfortable.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

