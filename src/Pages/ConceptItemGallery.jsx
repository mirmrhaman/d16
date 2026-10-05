import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Images } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { createPageUrl } from '@/utils';
import { selectionParams, togglePhotoSelection } from '@/data/conceptGallerySelection';
import { getConceptSectionId, readConceptGallery, MAX_CONCEPT_GALLERY_IMAGES } from '../../server/src/conceptGallerySchema.js';

function SelectablePhoto({ photo, index, selected, onSelect }) {
  const [unavailable, setUnavailable] = useState(false);
  const name = photo.title || `Design ${index + 1}`;
  return <button type="button" aria-pressed={selected} aria-label={`${selected ? 'Deselect' : 'Select'} ${name}`} onClick={onSelect} className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white text-left shadow-md transition-shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] ${selected ? 'ring-4 ring-[var(--accent)]' : 'hover:shadow-xl'}`}>
    <span className="relative block aspect-[4/3] w-full overflow-hidden bg-gray-100">{unavailable ? <span className="flex h-full items-center justify-center p-6 text-center text-gray-500">Photo currently unavailable</span> : <img src={photo.url} alt={name} loading="lazy" onError={() => setUnavailable(true)} className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105" />}<span className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border-2 shadow ${selected ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-white bg-black/30 text-white'}`} aria-hidden="true">{selected && <Check size={21} />}</span></span>
    <span className="block w-full space-y-2 p-5">{photo.title && <span className="block break-words text-xl font-bold text-[var(--primary)]">{photo.title}</span>}{photo.description && <span className="block whitespace-pre-line break-words text-sm leading-relaxed text-gray-600">{photo.description}</span>}<span className={`block text-sm font-medium ${selected ? 'text-[var(--primary)]' : 'text-gray-500'}`}>{selected ? 'Selected · click again to deselect' : 'Click to select'}</span></span>
  </button>;
}

export default function ConceptItemGallery() {
  const { conceptSlug, sectionId } = useParams();
  useEffect(() => { window.scrollTo(0, 0); }, [conceptSlug, sectionId]);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: concepts = [], isLoading, error, refetch } = useQuery({ queryKey: ['picYourConcept'], queryFn: () => base44.entities.PicYourConcept.list('order') });
  const concept = concepts.find((item) => String(item.slug || item.id) === conceptSlug);
  const matches = Array.isArray(concept?.sub_services) ? concept.sub_services.filter((section) => getConceptSectionId(section) === sectionId) : [];
  const section = matches.length === 1 ? matches[0] : null;
  const backUrl = concept ? createPageUrl(`PicYourConcept/${encodeURIComponent(concept.slug || String(concept.id))}`) : createPageUrl('PicYourConcept');
  const linkClass = 'inline-flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-6 py-3 font-semibold text-white';
  if (isLoading) return <div role="status" className="mx-auto max-w-7xl px-4 py-24">Loading concept gallery…</div>;
  if (error) return <div role="alert" className="mx-auto max-w-3xl space-y-5 px-4 py-24 text-center"><h1 className="text-3xl font-bold">We couldn’t load this gallery</h1><button type="button" onClick={() => refetch()} className={linkClass}>Try again</button><p><Link to={backUrl} className="underline">Back to concepts</Link></p></div>;
  if (!section) return <div className="mx-auto max-w-3xl space-y-5 px-4 py-24 text-center"><h1 className="text-3xl font-bold text-[var(--primary)]">Gallery not found</h1><p>This item may have changed or been removed. Please choose another concept.</p><Link to={backUrl} className={linkClass}><ArrowLeft size={18} />Back to concepts</Link></div>;
  const gallery = readConceptGallery(section, { allowDataImages: IS_DEMO });
  const requested = [...new Set(params.getAll('photo'))].slice(0, MAX_CONCEPT_GALLERY_IMAGES);
  const selected = gallery.items.filter((photo) => requested.includes(photo.id)).map((photo) => photo.id);
  const toggle = (id) => {
    const next = new URLSearchParams();
    togglePhotoSelection(selected, id).forEach((value) => next.append('photo', value));
    setParams(next, { replace: true, preventScrollReset: true });
  };
  return <div className="min-h-screen bg-gray-50">
    <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] py-14 text-white md:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><Link to={backUrl} className="mb-7 inline-flex items-center gap-2 text-sm text-white/85 hover:text-white"><ArrowLeft size={18} />Back to {concept.title}</Link><p className="mb-3 text-sm font-medium uppercase tracking-wider text-white/70">{concept.title} / {section.title}</p><h1 className="break-words text-4xl font-bold md:text-5xl">{gallery.title || section.title}</h1>{gallery.description && <p className="mt-6 max-w-3xl whitespace-pre-line break-words text-lg leading-relaxed text-gray-200">{gallery.description}</p>}</div></section>
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 md:py-20" aria-labelledby="pick-gallery-heading"><div className="mb-10 text-center"><h2 id="pick-gallery-heading" className="flex items-center justify-center gap-3 text-3xl font-bold text-[var(--primary)]"><Images className="shrink-0 text-[var(--accent)]" />Pick your concept</h2><p className="mt-4 text-gray-600">Select one or more designs you like. Click a selected image again to deselect it.</p></div>
      {requested.some((id) => !selected.includes(id)) && <p role="status" className="mb-6 rounded-lg bg-amber-50 p-4 text-amber-900">Some previously selected photos are no longer available. Please review your selection.</p>}
      {gallery.items.length ? <div className="grid items-stretch gap-7 sm:grid-cols-2 lg:grid-cols-3">{gallery.items.map((photo, index) => <SelectablePhoto key={photo.id} photo={photo} index={index} selected={selected.includes(photo.id)} onSelect={() => toggle(photo.id)} />)}</div> : <div className="rounded-2xl bg-white p-12 text-center"><p className="mb-5 text-gray-600">No gallery photos are available for this item yet.</p><Link to={backUrl} className={linkClass}>Back to {concept.title}</Link></div>}
      {gallery.items.length > 0 && <div className="mt-12 space-y-4 rounded-2xl border bg-white p-6 text-center"><p role="status" aria-live="polite" className="font-medium text-gray-700">{selected.length ? `${selected.length} design${selected.length === 1 ? '' : 's'} selected` : 'Please select a design to continue'}</p><button type="button" disabled={!selected.length} onClick={() => navigate(`${createPageUrl('Contact')}?${selectionParams(concept, section, selected)}`)} className={`${linkClass} max-w-full disabled:cursor-not-allowed disabled:bg-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]`}><span className="min-w-0 break-words">{gallery.continueLabel}</span><ArrowRight className="shrink-0" size={19} /></button><p className="text-sm text-gray-500">Your selected designs will be included with your consultation request.</p></div>}
    </section>
  </div>;
}
