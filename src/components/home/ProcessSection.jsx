import React from "react";
import { motion } from "framer-motion";
import SiteIcon from "@/components/SiteIcon";

const steps = [
  {
    icon: 'MessageSquare',
    iconKey: 'process.consultation',
    title: "Initial Consultation",
    description: "A professional architect from our team connects with you to understand your requirements and vision for the project."
  },
  {
    icon: 'FileText',
    iconKey: 'process.design',
    title: "Design Development",
    description: "We create comprehensive architectural plans and 3D visualizations, establishing a clear timeline and budget for your project."
  },
  {
    icon: 'Hammer',
    iconKey: 'process.execution',
    title: "Project Execution",
    description: "Our dedicated team executes the design plan with precision. Professional project management ensures quality at every stage."
  },
  {
    icon: 'CheckCircle',
    iconKey: 'process.handover',
    title: "Final Handover",
    description: "Post project completion, we conduct a thorough inspection and hand over the beautifully crafted space to you."
  }
];

export default function ProcessSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--primary)' }}>
            Our Process
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Tailored Architectural Solutions from Concept to Completion
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center luxury-shadow">
                    <SiteIcon iconKey={step.iconKey} fallback={step.icon} className="text-white" size={40} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-[var(--accent)] to-transparent -translate-x-4" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
