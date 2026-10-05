import React from 'react';
import { Link } from 'react-router-dom';
import { Images } from 'lucide-react';
import { IS_DEMO } from '@/api/transport';
import { conceptGalleryPath } from '@/data/conceptGallerySelection';
import { readConceptGallery } from '../../../server/src/conceptGallerySchema.js';

export default function ConceptGalleryLink({ concept, section }) {
  const { images, label } = readConceptGallery(section, { allowDataImages: IS_DEMO });
  if (!images.length) return null;
  return <Link to={conceptGalleryPath(concept, section)} className="inline-flex max-w-full items-center justify-center gap-2 rounded-md border border-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary)] transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"><Images size={18} className="shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{label}</span></Link>;
}
