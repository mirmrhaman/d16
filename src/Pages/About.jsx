import React from "react";
import { motion } from "framer-motion";
import { Award, Users, Target, Heart, Lightbulb, Rocket, Sparkles } from "lucide-react";

const teamMembers = [
  {
    name: "Ahmed Khan",
    role: "Lead Interior Designer",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80"
  },
  {
    name: "Sarah Rahman",
    role: "Senior Architect",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80"
  },
  {
    name: "Michael Chen",
    role: "Project Manager",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80"
  },
  {
    name: "Fatima Islam",
    role: "Design Consultant",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80"
  }
];

const approachSteps = [
  {
    icon: Lightbulb,
    title: "Discovery & Planning",
    description: "We start by exploring your goals, style, and lifestyle—shaping a clear direction for a design that fits you perfectly."
  },
  {
    icon: Rocket,
    title: "Design Development",
    description: "Our architects and designers craft detailed concepts, select materials, refine layouts, and create realistic 3D visuals to bring your ideas to life."
  },
  {
    icon: Award,
    title: "Execution & Coordination",
    description: "From material sourcing to site supervision, we handle every stage of implementation to ensure a smooth, timely, and quality-driven execution."
  },
  {
    icon: Sparkles,
    title: "Finishing & Handover",
    description: "We refine the final details, style the space, and deliver a complete, polished interior that matches your vision and expectations."
  }
];

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80"
          alt="About Us"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/80 to-[var(--primary)]/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white px-4"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4">About Us</h1>
            <p className="text-xl md:text-2xl">Space meets Style</p>
          </motion.div>
        </div>
      </div>

      {/* Company Philosophy */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-6">
                Our Philosophy
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                D16 Interior is an architect-led, design-driven studio focused on personality, comfort, functionality, 
                and timeless aesthetics. At D16 Interior, your space and style come together effortlessly, forming a 
                truly unique environment.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                From concept to completion, we deliver end-to-end interior design services with modern, functional, 
                and breathtaking solutions that keep every corner practical, comfortable, and beautiful.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <img 
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80"
                alt="Interior Design Philosophy"
                className="rounded-2xl shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              Our Approach
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A proven process that delivers exceptional results
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {approachSteps.map((step, index) => (
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
                    <div className="w-24 h-24 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center shadow-lg">
                      <step.icon className="text-white" size={40} />
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
                
                {index < approachSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-[var(--accent)] to-transparent -translate-x-4" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl p-8 md:p-12 text-white"
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-[var(--accent)] rounded-full flex items-center justify-center mr-4">
                  <Target className="text-white" size={24} />
                </div>
                <h3 className="text-2xl font-bold">Our Vision</h3>
              </div>
              <p className="text-lg text-gray-200 leading-relaxed">
                Creating Spaces That Inspire - At D16 Interior, we envision a world where every space is more 
                than just walls and furniture—it's an experience. We design interiors that seamlessly blend style, 
                functionality, and personality, transforming how people live, work, and feel within their environments.
              </p>
            </motion.div>

            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] rounded-2xl p-8 md:p-12 text-white"
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4">
                  <Heart className="text-[var(--accent)]" size={24} />
                </div>
                <h3 className="text-2xl font-bold">Our Mission</h3>
              </div>
              <p className="text-lg text-gray-100 leading-relaxed">
                Transforming Dreams into Reality - Our mission is to bring every idea to life through innovative, 
                sustainable, and personalized design solutions. We are committed to exceptional craftsmanship, 
                attention to detail, and seamless project execution, ensuring every space we create reflects the 
                unique style and lifestyle of our clients.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              Meet Our Skilled Team
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The talented professionals behind your dream spaces
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary)]/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-xl font-bold">{member.name}</h3>
                    <p className="text-gray-200">{member.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

