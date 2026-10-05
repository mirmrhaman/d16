import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createPageUrl } from "@/utils";
import ConceptGallery from "./ConceptGallery";

export default function CatalogueDetail({ item, isLoading, error, retry, catalogue, label, contextKey }) {
  const reducedMotion = useReducedMotion();
  const backUrl = createPageUrl(catalogue);
  const contactUrl = item ? `${createPageUrl("Contact")}?${new URLSearchParams({ [contextKey]: String(item.id), [`${contextKey}Title`]: item.title })}` : createPageUrl("Contact");
  const linkClass = "inline-flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]";

  if (isLoading) return <div className="mx-auto max-w-7xl px-4 py-20" role="status"><p className="mb-8 text-gray-600">Loading {label.toLowerCase()}…</p><div className="h-48 animate-pulse rounded-2xl bg-gray-100" /></div>;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-24 text-center" role="alert"><h1 className="mb-4 text-3xl font-bold text-[var(--primary)]">We couldn’t load this page</h1><p className="mb-6 text-gray-600">Please try again in a moment.</p><button type="button" onClick={retry} className={linkClass}>Try again</button></div>;
  if (!item) return <div className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="mb-4 text-3xl font-bold text-[var(--primary)]">{label} not found</h1><p className="mb-8 text-gray-600">This page may have moved. Explore the other options in our catalogue.</p><Link to={backUrl} className={linkClass}><ArrowLeft size={18} />Back to {catalogue === "Services" ? "Services" : "Pic Your Concept"}</Link></div>;

  const sections = Array.isArray(item.sub_services) ? item.sub_services : [];
  const features = Array.isArray(item.features) ? item.features : [];
  return <div className="min-h-screen bg-white">
    <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] py-16 text-white md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link to={backUrl} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/85 hover:text-white"><ArrowLeft size={16} />Back to {catalogue === "Services" ? "All Services" : "Pic Your Concept"}</Link>
        <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">{item.title}</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-gray-200">{item.description}</p>
      </div>
    </section>

    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl space-y-20 px-4 sm:px-6 md:space-y-28 lg:px-8">
        {sections.length > 0 ? sections.map((section, index) => <motion.article key={section.id || `${section.title}-${index}`} initial={reducedMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5 }} className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className={index % 2 ? "md:order-2" : ""}><div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100"><img src={section.image || item.image} alt={section.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 motion-safe:hover:scale-105" /></div></div>
          <div className={index % 2 ? "md:order-1" : ""}><h2 className="mb-5 text-2xl font-bold uppercase tracking-wide text-[var(--primary)] md:text-3xl">{section.title}</h2><p className="whitespace-pre-line text-base leading-relaxed text-gray-600 md:text-lg">{section.description}</p><div className="mt-8 flex flex-wrap gap-3">{catalogue === "PicYourConcept" && <ConceptGallery section={section} />}<Link to={contactUrl} className={linkClass}>Get a Quote<ArrowRight size={18} /></Link></div></div>
        </motion.article>) : <div className="grid items-center gap-10 md:grid-cols-2"><img src={item.image} alt={item.title} className="aspect-[4/3] w-full rounded-2xl object-cover" /><div><h2 className="mb-5 text-3xl font-bold text-[var(--primary)]">Designed around your space</h2><p className="mb-6 text-lg leading-relaxed text-gray-600">Tell us about your space, style, and budget. Our team will help you explore the right materials, layout, and finishing details.</p><Link to={contactUrl} className={linkClass}>Discuss your ideas<ArrowRight size={18} /></Link></div></div>}
        {features.length > 0 && <div className="rounded-2xl bg-gray-50 p-6 md:p-10"><h2 className="mb-6 text-2xl font-bold text-[var(--primary)]">What’s included</h2><ul className="grid gap-4 md:grid-cols-2">{features.map((feature, index) => <li key={`${feature}-${index}`} className="flex gap-3 text-gray-700"><Check size={20} className="shrink-0 text-[var(--accent)]" />{feature}</li>)}</ul></div>}
      </div>
    </section>

    <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] py-16 text-white md:py-24"><div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"><h2 className="mb-6 text-3xl font-bold md:text-4xl">Ready to Transform Your Space?</h2><p className="mb-8 text-xl text-gray-200">Contact us today and let’s bring your vision to life.</p><div className="flex flex-col justify-center gap-4 sm:flex-row"><Link to={contactUrl} className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-8 py-4 text-lg font-semibold text-white hover:bg-[var(--accent-dark)]">Book Consultation<ArrowRight size={20} /></Link><Link to={backUrl} className="inline-flex items-center justify-center gap-2 rounded-md border border-white px-8 py-4 text-lg font-semibold text-white hover:bg-white/10"><ArrowLeft size={20} />Explore More</Link></div></div></section>
  </div>;
}
