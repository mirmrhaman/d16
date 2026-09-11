import React from "react";
import { servicesClient } from "@/api/servicesClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const capabilityPillars = [
  { title: "Interior Design", description: "Tailored design concepts for residential and commercial spaces with balanced aesthetics and usability." },
  { title: "Custom Furniture & Fixtures", description: "Purpose-built furniture and fixtures crafted to fit your layout, style, and long-term durability goals." },
  { title: "Space Planning & Layout", description: "Smart zoning and circulation planning that improves comfort, flow, and day-to-day functionality." },
  { title: "Project Management", description: "End-to-end coordination of vendors, materials, schedule, and execution quality from start to handover." },
  { title: "Sustainable & Innovative Solutions", description: "Energy-conscious materials and thoughtful design decisions that reduce waste and elevate performance." },
  { title: "Consultation & Styling", description: "Professional consultation and finishing support to refine every detail and complete your desired look." }
];
const slugify = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function Services() {
  const reducedMotion = useReducedMotion();
  const { data: services = [], isLoading, error, refetch } = useQuery({ queryKey: ["services"], queryFn: () => servicesClient.list() });
  const orderedServices = [...services].sort((a, b) => (a.order ?? a.sort_order ?? 0) - (b.order ?? b.sort_order ?? 0));

  return <div className="min-h-screen bg-white">
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center md:mb-16">
          <h1 className="mb-6 text-4xl font-bold text-[var(--primary)] md:text-5xl">Our Services</h1>
          <p className="mx-auto max-w-4xl text-lg leading-relaxed text-gray-600">Our team of experienced designers and project managers work closely with clients to understand their needs and preferences, ensuring every project reflects a unique personality while staying within budget and timeline. With a commitment to quality craftsmanship, creative innovation, and meticulous attention to detail, we create interiors that are as inspiring as they are inviting.</p>
        </div>
        {isLoading && <div role="status"><p className="sr-only">Loading services…</p><div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-2xl bg-gray-100" />)}</div></div>}
        {error && <div role="alert" className="py-12 text-center"><p className="mb-4 text-gray-600">We couldn’t load the services. Please try again.</p><button type="button" onClick={() => refetch()} className="rounded-md bg-[var(--primary)] px-6 py-3 font-semibold text-white">Try again</button></div>}
        {!isLoading && !error && orderedServices.length === 0 && <p className="py-12 text-center text-gray-600">No services are available yet.</p>}
        {!error && <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {orderedServices.map((service, index) => <motion.div key={service.id} initial={reducedMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: (index % 4) * .05 }} viewport={{ once: true }}>
            <Link to={createPageUrl("Services/" + slugify(service.slug || service.title))} className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]">
              <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100"><img src={service.image} alt={service.title} loading={index < 4 ? "eager" : "lazy"} className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-125" /></div>
              <h2 className="pb-2 pt-3 text-center text-sm font-semibold leading-snug text-[var(--primary)] transition-colors group-hover:text-[var(--accent)] md:text-base">{service.title}</h2>
            </Link>
          </motion.div>)}
        </div>}
      </div>
    </section>

    <section className="bg-gray-50 py-16 md:py-24"><div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2 lg:px-8"><img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80" alt="Thoughtfully designed living space" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" /><div><h2 className="mb-6 text-3xl font-bold text-[var(--primary)] md:text-4xl">Comprehensive Interior Design Services</h2><p className="mb-6 text-lg leading-relaxed text-gray-600">Across Bangladesh, our comprehensive interior design services encompass the full spectrum of residential and commercial projects, including custom homes, offices, restaurants, renovations, and bespoke furniture.</p><p className="text-lg leading-relaxed text-gray-600">From sign-up to handover, D16 Interior stands by your side, ensuring a seamless and professional interior design process. It's time to create a space that speaks YOUR language, something that imbibes YOU.</p></div></div></section>

    <section className="py-16 md:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-12 text-center"><h2 className="mb-4 text-3xl font-bold text-[var(--primary)] md:text-4xl">From Vision to Finishing Touches</h2><p className="mx-auto max-w-3xl text-lg text-gray-600">Our six core capabilities combine strategy, design excellence, and practical execution for every project type.</p></div><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{capabilityPillars.map((pillar) => <article key={pillar.title} className="rounded-2xl border border-[var(--accent-light)] p-6"><h3 className="mb-3 text-xl font-bold text-[var(--primary)]">{pillar.title}</h3><p className="leading-relaxed text-gray-600">{pillar.description}</p></article>)}</div></div></section>

    <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] py-16 text-white md:py-24"><div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"><h2 className="mb-6 text-3xl font-bold md:text-4xl">Let your Interiors make you shine in their own way</h2><p className="mb-8 text-xl text-gray-200">Contact us today for the perfect interiors!</p><Link to={createPageUrl("Contact")} className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-8 py-4 text-lg font-semibold text-white hover:bg-[var(--accent-dark)]">Book Consultation<ArrowRight size={20} /></Link></div></section>
  </div>;
}
