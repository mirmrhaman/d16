import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function PicYourConcept() {
  const { data: concepts = [], isLoading, error, refetch } = useQuery({
    queryKey: ["picYourConcept"],
    queryFn: () => base44.entities.PicYourConcept.list("order"),
  });

  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-6 text-4xl font-bold text-[var(--primary)] md:text-5xl">Pic Your Concept</h1>
          <p className="mx-auto max-w-4xl text-lg leading-relaxed text-gray-600">
            Explore our curated furniture concepts for every space in your home or office. From serene bedrooms and elegant dining areas to functional offices and peaceful prayer spaces — each piece is crafted with precision, quality materials, and a deep understanding of your lifestyle.
          </p>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {error ? (
            <div role="alert" className="py-12 text-center"><p className="mb-4 text-gray-600">We couldn’t load the concepts. Please try again.</p><Button onClick={() => refetch()}>Try again</Button></div>
          ) : isLoading ? (
            <p className="py-12 text-center text-gray-500">Loading concepts…</p>
          ) : concepts.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No concepts are available yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {concepts.map((concept) => (
                <Link
                  key={concept.id}
                  to={createPageUrl(`PicYourConcept/${concept.slug || concept.id}`)}
                  className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
                >
                  <div className="aspect-square overflow-hidden rounded-2xl"><img src={concept.image} alt={concept.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-125" /></div>
                  <h2 className="mt-3 text-center text-base font-semibold text-[var(--primary)]">{concept.title}</h2>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] py-16 text-white md:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">Let your Interiors make you shine in their own way</h2>
          <p className="mb-8 text-xl text-gray-200">Contact us today for the perfect interiors!</p>
          <Link to={createPageUrl("Contact")}><Button className="bg-[var(--accent)] px-8 py-6 text-white hover:bg-[var(--accent-dark)]">Book Consultation →</Button></Link>
        </div>
      </section>
    </div>
  );
}
