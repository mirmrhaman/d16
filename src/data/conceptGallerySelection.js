import { getConceptSectionId, readConceptGallery, MAX_CONCEPT_GALLERY_IMAGES } from '../../server/src/conceptGallerySchema.js';

export const conceptGalleryPath = (concept, section) => `/PicYourConcept/${encodeURIComponent(concept.slug || String(concept.id))}/gallery/${encodeURIComponent(getConceptSectionId(section))}`;

export function togglePhotoSelection(selected, id) {
  return selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
}

export function selectionParams(concept, section, selected) {
  const params = new URLSearchParams({ conceptGallery: '1', concept: String(concept.id), conceptSection: getConceptSectionId(section) });
  for (const id of [...new Set(selected)].slice(0, MAX_CONCEPT_GALLERY_IMAGES)) params.append('photo', id);
  return params;
}

export function resolveGallerySelection(concepts, params, options = {}) {
  const concept = concepts.find((item) => String(item.id) === params.get('concept'));
  const sections = Array.isArray(concept?.sub_services) ? concept.sub_services.filter((item) => getConceptSectionId(item) === params.get('conceptSection')) : [];
  if (!concept || sections.length !== 1) return { selection: null, warning: 'This concept gallery is no longer available. Please choose your inspiration again.' };
  const section = sections[0];
  const gallery = readConceptGallery(section, options);
  const requested = [...new Set(params.getAll('photo'))];
  if (requested.length > MAX_CONCEPT_GALLERY_IMAGES) return { selection: null, warning: 'This selection is invalid. Please choose your inspiration again.' };
  const photos = gallery.items.filter((item) => requested.includes(item.id));
  if (!photos.length) return { selection: null, warning: 'The selected photos are no longer available. Please choose your inspiration again.' };
  return { selection: { concept, section, photos }, warning: photos.length < requested.length ? 'Some selected photos are no longer available. Only the photos shown below will be included.' : '' };
}

export function gallerySelectionMessage({ concept, section, photos }) {
  // Public identifiers and short titles fit the encrypted consultation message.
  // Never put data images, full remote URLs or private contact fields in the URL.
  return `I am interested in: ${String(concept.title).slice(0, 180)} — ${String(section.title).slice(0, 180)}\nConcept reference: ${String(concept.id).slice(0, 80)} / ${getConceptSectionId(section)}\nSelected photos:\n${photos.map((photo) => `- ${photo.title || 'Untitled photo'} [${photo.id}]`).join('\n')}\n\n`;
}
