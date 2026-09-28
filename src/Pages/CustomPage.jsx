import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, Image as ImageIcon, MessageSquare, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { createPageUrl } from '@/utils';
import { resolvePublicCustomPage } from '@/data/publicCustomPages';

const container = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';
const prose = 'whitespace-pre-line break-words [overflow-wrap:anywhere] leading-relaxed';
const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]';

function PageImage({ src, alt, className = '', portrait = false, eager = false }) {
  const [failedSource, setFailedSource] = useState(null);
  const showImage = src && src !== failedSource;
  const Placeholder = portrait ? Users : ImageIcon;
  return <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
    {showImage ? <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailedSource(src)}
      className="h-full w-full object-cover"
    /> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400" aria-hidden="true"><Placeholder size={portrait ? 64 : 40} strokeWidth={1} /></div>}
  </div>;
}

function ItemText({ item, centered = false }) {
  return <div className={`min-w-0 ${centered ? 'text-center' : ''}`}>
    {item.meta && <p className={`mb-3 text-sm font-semibold text-[var(--accent-dark)] ${prose}`}>{item.meta}</p>}
    <h2 className={`mb-4 text-2xl font-bold text-[var(--primary)] ${prose}`}>{item.title}</h2>
    {item.text && <p className={`text-base text-gray-600 ${prose}`}>{item.text}</p>}
  </div>;
}

function StorySections({ items, landing = false }) {
  return <div className="space-y-12 md:space-y-20">
    {items.map((item, index) => <article key={item.id} className={`grid min-w-0 items-center gap-8 md:gap-12 ${item.image ? 'md:grid-cols-2' : ''}`}>
      {item.image && <PageImage src={item.image} alt={item.title} className={`aspect-[4/3] rounded-2xl shadow-lg ${index % 2 ? 'md:order-2' : ''}`} />}
      <div className="min-w-0">
        {landing && <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-light)] font-bold text-[var(--primary)]" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>}
        <ItemText item={item} />
      </div>
    </article>)}
  </div>;
}

function ServiceCards({ items }) {
  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((item) => <article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {item.image && <PageImage src={item.image} alt={item.title} className="aspect-[4/3]" />}
      <div className="border-t-4 border-[var(--accent)] p-6"><ItemText item={item} /></div>
    </article>)}
  </div>;
}

function ProjectCards({ items }) {
  return <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((item) => <article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <PageImage src={item.image} alt={item.title} className="aspect-[4/3]" />
      <div className="p-6"><ItemText item={item} /></div>
    </article>)}
  </div>;
}

function ConceptCards({ items }) {
  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((item) => <article key={item.id} className="min-w-0 rounded-2xl border border-[var(--accent-light)] bg-white p-4 sm:p-5">
      <PageImage src={item.image} alt={item.title} className="mb-6 aspect-square rounded-xl" />
      <ItemText item={item} centered />
    </article>)}
  </div>;
}

function ImageGallery({ items }) {
  return <div className="grid items-start gap-8 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((item) => <figure key={item.id} className="min-w-0">
      <PageImage src={item.image} alt={item.title} className="aspect-square rounded-2xl" />
      <figcaption className="pt-5"><ItemText item={item} /></figcaption>
    </figure>)}
  </div>;
}

function Articles({ items }) {
  return <div className="mx-auto max-w-4xl space-y-10">
    {items.map((item) => <article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {item.image && <PageImage src={item.image} alt={item.title} className="aspect-[16/9]" />}
      <div className="p-6 md:p-8">
        {item.meta && <p className={`mb-3 text-sm text-[var(--accent-dark)] ${prose}`}>{item.meta}</p>}
        <h2 className={`text-2xl font-bold text-[var(--primary)] md:text-3xl ${prose}`}>{item.title}</h2>
        {item.text && <details className="group mt-5">
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded text-sm font-semibold text-[var(--accent-dark)] [&::-webkit-details-marker]:hidden ${focusRing}`}>
            <span>Read article<span className="sr-only">: {item.title}</span></span><ChevronDown aria-hidden="true" size={20} className="shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className={`mt-5 border-t border-gray-100 pt-5 text-gray-600 ${prose}`}>{item.text}</div>
        </details>}
      </div>
    </article>)}
  </div>;
}

function ContactCards({ items }) {
  return <div className="grid gap-6 sm:grid-cols-2">
    {items.map((item) => <article key={item.id} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
      {item.image ? <PageImage src={item.image} alt={item.title} className="mb-6 aspect-[16/9] rounded-xl" /> : <div className="mb-5 inline-flex rounded-full bg-[var(--accent-light)] p-3 text-[var(--primary)]" aria-hidden="true"><MessageSquare size={24} /></div>}
      <ItemText item={item} />
    </article>)}
  </div>;
}

function Questions({ items }) {
  return <div className="mx-auto max-w-4xl space-y-4">
    {items.map((item) => <details key={item.id} className="group min-w-0 rounded-2xl border border-gray-200 bg-white p-6 open:border-[var(--accent)]">
      <summary className={`flex cursor-pointer list-none items-center justify-between gap-5 rounded [&::-webkit-details-marker]:hidden ${focusRing}`}>
        <h2 className={`min-w-0 text-xl font-semibold text-[var(--primary)] ${prose}`}>{item.title}</h2>
        <ChevronDown aria-hidden="true" className="shrink-0 text-[var(--accent-dark)] transition-transform group-open:rotate-180" size={22} />
      </summary>
      <div className="mt-5 border-t border-gray-100 pt-5">
        {item.meta && <p className={`mb-3 text-sm font-medium text-[var(--accent-dark)] ${prose}`}>{item.meta}</p>}
        {item.text && <p className={`text-gray-600 ${prose}`}>{item.text}</p>}
        {item.image && <PageImage src={item.image} alt={item.title} className="mt-5 aspect-[16/9] rounded-xl" />}
      </div>
    </details>)}
  </div>;
}

function TeamCards({ items }) {
  return <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((item) => <article key={item.id} className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-lg">
      <PageImage src={item.image} alt={item.title} portrait className="aspect-[4/5]" />
      <div className="p-6 text-center">
        <h2 className={`mb-2 text-2xl font-bold text-[var(--primary)] ${prose}`}>{item.title}</h2>
        {item.meta && <p className={`mb-4 font-semibold text-[var(--accent-dark)] ${prose}`}>{item.meta}</p>}
        {item.text && <p className={`text-gray-600 ${prose}`}>{item.text}</p>}
      </div>
    </article>)}
  </div>;
}

const templates = {
  landing: (items) => <StorySections items={items} landing />,
  standard: (items) => <StorySections items={items} />,
  services: (items) => <ServiceCards items={items} />,
  portfolio: (items) => <ProjectCards items={items} />,
  concepts: (items) => <ConceptCards items={items} />,
  gallery: (items) => <ImageGallery items={items} />,
  blog: (items) => <Articles items={items} />,
  contact: (items) => <ContactCards items={items} />,
  faq: (items) => <Questions items={items} />,
  team: (items) => <TeamCards items={items} />,
};

function ConsultationLink() {
  return <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] px-4 py-12 text-center text-white sm:px-6">
    <Link to={createPageUrl('Contact')} className={`inline-flex items-center gap-3 rounded-lg bg-[var(--accent)] px-7 py-4 font-semibold text-white hover:bg-[var(--accent-dark)] ${focusRing}`}>Book Consultation<ArrowRight size={20} aria-hidden="true" /></Link>
  </div>;
}

function UnavailablePage({ missing, refetch, isFetching }) {
  return <div className="min-h-[60vh] bg-white px-4 py-24 text-center" role={missing ? undefined : 'alert'}>
    <h1 className="mb-4 text-3xl font-bold text-[var(--primary)]">{missing ? 'Page not found' : 'Page unavailable'}</h1>
    <p className="mx-auto mb-6 max-w-xl text-gray-600">{missing ? 'This page is not currently published or is no longer available.' : 'We couldn’t load this page. Please try again.'}</p>
    <div className="flex flex-wrap justify-center gap-4">
      {!missing && <button type="button" disabled={isFetching} onClick={() => refetch()} className={`rounded-md bg-[var(--primary)] px-6 py-3 font-semibold text-white disabled:opacity-60 ${focusRing}`}>{isFetching ? 'Trying again…' : 'Try again'}</button>}
      <Link to={createPageUrl('Home')} className={`rounded-md border border-gray-300 px-6 py-3 font-semibold text-[var(--primary)] ${focusRing}`}>Back to Home</Link>
    </div>
  </div>;
}

export default function CustomPage() {
  const { pageId } = useParams();
  const { data, isPending, error, isFetching, refetch } = useQuery({
    queryKey: ['customPages', 'public'],
    queryFn: async () => {
      const records = await base44.entities.CustomPage.list();
      if (!Array.isArray(records)) throw new Error('The page list could not be loaded.');
      return records;
    },
  });

  if (isPending) return <div className="min-h-[60vh] bg-white px-4 py-24 text-center text-gray-600" role="status">Loading page…</div>;
  if (error) return <UnavailablePage refetch={refetch} isFetching={isFetching} />;
  const { status, page } = resolvePublicCustomPage(data, pageId, { allowDataImages: IS_DEMO });
  if (status !== 'available' || !templates[page?.page_type]) return <UnavailablePage missing={status === 'not-found'} refetch={refetch} isFetching={isFetching} />;

  return <div className="min-h-screen bg-white">
    <header className="relative isolate overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] py-20 text-white md:py-28">
      {page.hero_image && <><PageImage src={page.hero_image} alt="" eager className="absolute inset-0 -z-20" /><div className="absolute inset-0 -z-10 bg-[var(--primary)]/80" aria-hidden="true" /></>}
      <div className={`${container} text-center`}>
        <h1 className={`mx-auto max-w-5xl text-4xl font-bold md:text-6xl ${prose}`}>{page.title}</h1>
        {page.intro && <p className={`mx-auto mt-6 max-w-4xl text-lg text-gray-100 md:text-xl ${prose}`}>{page.intro}</p>}
      </div>
    </header>
    {page.body && <section className="border-b border-gray-100 bg-white py-12 md:py-16"><div className={`${container} ${prose} max-w-5xl text-lg text-gray-600`}>{page.body}</div></section>}
    {page.items.length > 0 && <section className={`py-12 md:py-20 ${['team', 'faq', 'contact'].includes(page.page_type) ? 'bg-gray-50' : ''}`} aria-label={`${page.title} content`}><div className={container}>{templates[page.page_type](page.items)}</div></section>}
    {['landing', 'services', 'concepts', 'contact'].includes(page.page_type) && <ConsultationLink />}
  </div>;
}
