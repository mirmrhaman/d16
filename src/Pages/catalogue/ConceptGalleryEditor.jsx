import React, { useId, useState } from 'react';
import { ArrowLeft, ArrowRight, Trash2, Images } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_GALLERY_LABEL, DEFAULT_GALLERY_CONTINUE_LABEL, DEMO_GALLERY_FILE_BYTES, MAX_CONCEPT_GALLERY_IMAGES, isSafeGalleryImage, getGalleryImageId } from '../../../server/src/conceptGallerySchema.js';

export default function ConceptGalleryEditor({ section, onChange, onBusy, onError }) {
  const id = useId();
  const [url, setUrl] = useState('');
  const [progress, setProgress] = useState('');
  const images = Array.isArray(section.gallery_images) ? section.gallery_images : [];
  const imageUrl = (image) => typeof image === 'string' ? image : image.url;
  const photo = (url) => ({ id: crypto.randomUUID(), url, title: '', description: '' });
  const editPhoto = (index, key, value) => onChange('gallery_images', images.map((image, position) => position === index ? { ...(typeof image === 'string' ? { id: getGalleryImageId(image), url: image, title: '', description: '' } : image), [key]: value } : image));
  const limit = IS_DEMO ? DEMO_GALLERY_FILE_BYTES : 5 * 1024 * 1024;
  const limitLabel = IS_DEMO ? '500 KB' : '5 MB';
  const addUrl = () => {
    const next = url.trim();
    if (!isSafeGalleryImage(next)) return onError('Enter a valid http/https image URL or local upload path.');
    if (images.some((image) => imageUrl(image) === next)) return onError('That image is already in this gallery.');
    if (images.length >= MAX_CONCEPT_GALLERY_IMAGES) return onError(`A section gallery can contain up to ${MAX_CONCEPT_GALLERY_IMAGES} images.`);
    onChange('gallery_images', [...images, photo(next)]); setUrl(''); onError('');
  };
  const upload = async (event) => {
    const input = event.target;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;
    if (files.length + images.length > MAX_CONCEPT_GALLERY_IMAGES) return onError(`Choose at most ${MAX_CONCEPT_GALLERY_IMAGES - images.length} more images for this section.`);
    if (files.some((file) => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > limit || !file.size)) return onError(`Choose non-empty PNG, JPEG or WEBP files up to ${limitLabel} each. No images from this selection were added.`);
    onBusy(1); onError('');
    const added = []; let failed = 0; let duplicates = 0;
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Uploading ${index + 1} of ${files.length}…`);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          if (!isSafeGalleryImage(file_url, { allowDataImages: IS_DEMO })) throw new Error('Invalid uploaded image');
          if (images.some((image) => imageUrl(image) === file_url) || added.some((image) => image.url === file_url)) duplicates++;
          else added.push(photo(file_url));
        } catch { failed++; }
      }
      if (added.length) onChange('gallery_images', (current) => [...(Array.isArray(current) ? current : []), ...added]);
      setProgress(`${added.length} image${added.length === 1 ? '' : 's'} added. Save the concept to keep your changes.${duplicates ? ` ${duplicates} duplicate image(s) skipped.` : ''}`);
      if (failed) onError(`${failed} image(s) could not be uploaded. Successful uploads are still in your draft. Please retry only the failed images.`);
    } finally { onBusy(-1); }
  };
  const move = (index, direction) => {
    const next = [...images]; const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];
    onChange('gallery_images', next);
  };

  return <div className="space-y-4 rounded-xl border border-[var(--primary)]/20 bg-white p-4">
    <div><h3 className="flex items-center gap-2 font-semibold text-[var(--primary)]"><Images size={18} aria-hidden="true" />Item gallery (optional)</h3><p className="mt-1 text-sm text-gray-600">Photos for {section.title || 'this item'} only. The gallery button appears beside Get a Quote when at least one photo is saved. Leave empty to hide it.</p></div>
    <div className="space-y-2"><Label htmlFor={`${id}-label`}>Gallery button name</Label><Input id={`${id}-label`} maxLength={60} placeholder={DEFAULT_GALLERY_LABEL} value={section.gallery_button_label ?? ''} onChange={(event) => onChange('gallery_button_label', event.target.value)} /><p className="text-xs text-gray-500">For example: View Gallery, Gallery, Images or Design Ideas. Blank uses “View Gallery”.</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`${id}-title`}>Gallery page title (optional)</Label><Input id={`${id}-title`} maxLength={180} placeholder={section.title || 'Uses the item name when blank'} value={section.gallery_title ?? ''} onChange={(event) => onChange('gallery_title', event.target.value)} /></div><div className="space-y-2"><Label htmlFor={`${id}-continue`}>Continue button name</Label><Input id={`${id}-continue`} maxLength={60} placeholder={DEFAULT_GALLERY_CONTINUE_LABEL} value={section.gallery_continue_label ?? ''} onChange={(event) => onChange('gallery_continue_label', event.target.value)} /></div></div>
    <div className="space-y-2"><Label htmlFor={`${id}-description`}>Gallery page description (optional)</Label><Textarea id={`${id}-description`} maxLength={3000} rows={3} value={section.gallery_description ?? ''} onChange={(event) => onChange('gallery_description', event.target.value)} /><p className="text-xs text-gray-500">The gallery opens as a separate page with selectable photos, not a popup. Visitors can select several designs and continue to the contact form. No videos are shown.</p></div>
    <div className="space-y-2"><Label htmlFor={`${id}-files`}>Upload gallery images (select several)</Label><input id={`${id}-files`} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={upload} className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-gray-50 file:px-3 file:py-2" /><p className="text-xs text-gray-500">PNG, JPEG or WEBP, up to {limitLabel} each; up to {MAX_CONCEPT_GALLERY_IMAGES} photos per item. These are public website images—do not upload confidential files.</p></div>
    {IS_DEMO && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Client preview: uploads and edits are saved only in this browser, not shared with other devices. Use small images or image URLs to avoid browser storage limits. Shared uploads require the database-backed site.</p>}
    <div className="space-y-2"><Label htmlFor={`${id}-url`}>Or add an image URL</Label><div className="flex flex-col gap-2 sm:flex-row"><Input id={`${id}-url`} type="url" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addUrl(); } }} placeholder="https://example.com/master-bedroom.jpg" /><Button type="button" variant="outline" onClick={addUrl} disabled={!url.trim() || images.length >= MAX_CONCEPT_GALLERY_IMAGES}>Add image</Button></div></div>
    {progress && <p role="status" className="text-sm text-gray-600">{progress}</p>}
    <p className="text-sm font-medium text-gray-700">{images.length} gallery photo{images.length === 1 ? '' : 's'}</p>
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{images.map((image, index) => <li key={getGalleryImageId(image)} className="min-w-0 space-y-3 rounded-lg border p-3"><img src={imageUrl(image)} alt={`${section.title || 'Item'} gallery photo ${index + 1}`} loading="lazy" className="aspect-[4/3] w-full rounded-md bg-gray-100 object-cover" /><div className="flex items-center justify-between gap-1"><span className="text-xs text-gray-500">Photo {index + 1}</span><div className="flex gap-1"><Button type="button" size="icon" variant="outline" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move gallery photo ${index + 1} earlier`}><ArrowLeft size={16} /></Button><Button type="button" size="icon" variant="outline" disabled={index === images.length - 1} onClick={() => move(index, 1)} aria-label={`Move gallery photo ${index + 1} later`}><ArrowRight size={16} /></Button><Button type="button" size="icon" variant="outline" onClick={() => onChange('gallery_images', images.filter((_, position) => position !== index))} aria-label={`Remove gallery photo ${index + 1}`}><Trash2 size={16} /></Button></div></div><div className="space-y-1"><Label htmlFor={`${id}-photo-${index}-title`}>Photo {index + 1} title (optional)</Label><Input id={`${id}-photo-${index}-title`} maxLength={180} value={image.title || ''} onChange={(event) => editPhoto(index, 'title', event.target.value)} /></div><div className="space-y-1"><Label htmlFor={`${id}-photo-${index}-description`}>Photo {index + 1} description (optional)</Label><Textarea id={`${id}-photo-${index}-description`} maxLength={2000} rows={3} value={image.description || ''} onChange={(event) => editPhoto(index, 'description', event.target.value)} /></div></li>)}</ol>
  </div>;
}
