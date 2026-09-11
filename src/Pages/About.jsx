import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ABOUT_PAGE_ID, resolveAboutContent, safeAboutImage } from "@/data/aboutContent";
import SiteIcon from "@/components/SiteIcon";

export default function About() {
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["aboutPage", "public"],
    queryFn: async () => {
      const records = await base44.entities.AboutPage.list();
      if (!Array.isArray(records)) throw new Error("The About page could not be loaded.");
      return records.find((record) => record.id === ABOUT_PAGE_ID) || records[0] || null;
    },
  });

  if (isPending) return <div className="min-h-[60vh] bg-white px-4 py-24 text-center text-gray-600" role="status">Loading About Us…</div>;
  if (error) return <div className="min-h-[60vh] bg-white px-4 py-24 text-center" role="alert"><h1 className="mb-4 text-3xl font-bold text-[var(--primary)]">About Us</h1><p className="mb-6 text-gray-600">We couldn’t load the About page. Please try again.</p><button type="button" onClick={() => refetch()} disabled={isFetching} className="rounded-md bg-[var(--primary)] px-6 py-3 font-semibold text-white disabled:opacity-60">{isFetching ? "Trying again…" : "Try again"}</button></div>;

  const about = resolveAboutContent(data);
  const approachSteps = about.approach_steps;
  const teamMembers = about.team_members;
  const heroImage = safeAboutImage(about.hero_image);
  const philosophyImage = safeAboutImage(about.philosophy_image);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden bg-[var(--primary)]">
        {heroImage && <img
          src={heroImage}
          alt={about.title}
          className="w-full h-full object-cover"
        />}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/80 to-[var(--primary)]/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white px-4"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{about.title}</h1>
            <p className="text-xl md:text-2xl whitespace-pre-line">{about.subtitle}</p>
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
                {about.philosophy_title}
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed whitespace-pre-line">
                {about.philosophy_text}
              </p>
              <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-line">
                {about.philosophy_detail}
              </p>
              <p className="mt-6 text-lg font-medium leading-relaxed text-[var(--primary)] whitespace-pre-line">
                {about.mission_summary}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              {philosophyImage ? <img
                src={philosophyImage}
                alt={about.philosophy_title}
                className="rounded-2xl shadow-2xl"
              /> : <div aria-hidden="true" className="aspect-[4/3] rounded-2xl bg-gray-100" />}
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
              {about.approach_title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto whitespace-pre-line">
              {about.approach_subtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {approachSteps.map((step, index) => {
              return (
              <motion.div
                key={typeof step.id === "string" ? step.id : index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center shadow-lg">
                      <SiteIcon iconKey={`about.step.${step.id}`} fallback={step.icon || 'Lightbulb'} className="text-white" size={40} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {step.description}
                  </p>
                </div>
                
                {index < approachSteps.length - 1 && index % 4 !== 3 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-[var(--accent)] to-transparent -translate-x-4" />
                )}
              </motion.div>
            ); })}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center"><h2 className="mb-4 text-3xl font-bold text-[var(--primary)] md:text-4xl">{about.principles_title}</h2><p className="mx-auto max-w-2xl text-xl text-gray-600 whitespace-pre-line">{about.principles_subtitle}</p></div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl p-8 md:p-12 text-white"
            >
              <div aria-hidden="true" className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--accent)]/20 transition-transform duration-700 motion-safe:group-hover:scale-150" />
              <div aria-hidden="true" className="absolute -bottom-12 -left-12 h-28 w-28 rounded-full bg-white/10 transition-transform duration-700 motion-safe:group-hover:scale-150" />
              <div className="relative flex items-center mb-6">
                <div className="w-12 h-12 bg-[var(--accent)] rounded-full flex items-center justify-center mr-4">
                  <SiteIcon iconKey="about.vision" fallback="Target" className="text-white" size={24} />
                </div>
                <h3 className="text-2xl font-bold">{about.vision_title}</h3>
              </div>
              <p className="relative text-lg text-gray-200 leading-relaxed whitespace-pre-line">
                {about.vision_text}
              </p>
            </motion.div>

            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] rounded-2xl p-8 md:p-12 text-white"
            >
              <div aria-hidden="true" className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 transition-transform duration-700 motion-safe:group-hover:scale-150" />
              <div aria-hidden="true" className="absolute -bottom-12 -left-12 h-28 w-28 rounded-full bg-white/10 transition-transform duration-700 motion-safe:group-hover:scale-150" />
              <div className="relative flex items-center mb-6">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4">
                  <SiteIcon iconKey="about.mission" fallback="Heart" className="text-[var(--accent)]" size={24} />
                </div>
                <h3 className="text-2xl font-bold">{about.mission_title}</h3>
              </div>
              <p className="relative text-lg text-gray-100 leading-relaxed whitespace-pre-line">
                {about.mission_text}
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
              {about.team_title}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto whitespace-pre-line">
              {about.team_subtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => {
              const memberImage = safeAboutImage(member.image);
              return (
              <motion.div
                key={typeof member.id === "string" ? member.id : index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative h-64 overflow-hidden bg-gray-100">
                  {memberImage && <img
                    src={memberImage}
                    alt={member.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary)]/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-xl font-bold">{member.name}</h3>
                    <p className="text-gray-200 whitespace-pre-line">{member.role}</p>
                  </div>
                </div>
              </motion.div>
            ); })}
          </div>
        </div>
      </section>
    </div>
  );
}
