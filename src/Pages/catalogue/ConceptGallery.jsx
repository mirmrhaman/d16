import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import { IS_DEMO } from '@/api/transport';
import { readConceptGallery } from '../../../server/src/conceptGallerySchema.js';

function GalleryPhoto({ src, title, number }) {
  const [state, setState] = useState('loading');
  return <div className="relative flex min-h-48 items-center justify-center rounded-lg bg-black/30">
    {state === 'loading' && <p role="status" className="absolute text-sm text-white/80">Loading image…</p>}
    {state === 'error' ? <p role="alert" className="p-8 text-center text-white/80">This photo is currently unavailable. Please try another photo.</p> : <img src={src} alt={`${title} — gallery photo ${number}`} onLoad={() => setState('loaded')} onError={() => setState('error')} className="max-h-[55dvh] w-full rounded-lg object-contain" />}
  </div>;
}

function GalleryDialog({ images, title, onClose }) {
  const ref = useRef(null);
  const id = useId();
  const [index, setIndex] = useState(0);
  const move = (direction) => setIndex((current) => (current + direction + images.length) % images.length);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  const control = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/30 px-3 text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
  return createPortal(<dialog ref={ref} aria-labelledby={`${id}-title`} aria-describedby={`${id}-count`} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={(event) => { if (images.length > 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } }} className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-2xl bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-black/80">
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 id={`${id}-title`} className="text-xl font-semibold sm:text-2xl">{title} — Gallery</h2><p id={`${id}-count`} role="status" aria-live="polite" className="mt-1 text-sm text-white/70">Photo {index + 1} of {images.length}</p></div><button type="button" autoFocus className={control} aria-label="Close gallery" onClick={onClose}><X size={22} /></button></div>
      <GalleryPhoto key={images[index]} src={images[index]} title={title} number={index + 1} />
      {images.length > 1 && <><div className="flex items-center justify-between gap-3"><button type="button" onClick={() => move(-1)} className={control} aria-label="Previous photo"><ChevronLeft size={22} /><span className="ml-1 text-sm">Previous</span></button><span className="hidden text-xs text-white/60 sm:block">Use arrow keys to browse · Esc to close</span><button type="button" onClick={() => move(1)} className={control} aria-label="Next photo"><span className="mr-1 text-sm">Next</span><ChevronRight size={22} /></button></div><div className="flex gap-2 overflow-x-auto p-1" aria-label="Gallery thumbnails">{images.map((image, position) => <button key={image} type="button" onClick={() => setIndex(position)} aria-label={`Show photo ${position + 1}`} aria-current={position === index ? 'true' : undefined} className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${position === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}</div></>}
    </div>
  </dialog>, document.body);
}

export default function ConceptGallery({ section }) {
  const [open, setOpen] = useState(false);
  const { images, label } = readConceptGallery(section, { allowDataImages: IS_DEMO });
  if (!images.length) return null;
  return <><button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary)] transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"><Images size={18} aria-hidden="true" />{label}</button>{open && <GalleryDialog images={images} title={section.title} onClose={() => setOpen(false)} />}</>;
}
