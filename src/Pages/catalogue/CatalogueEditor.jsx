import React, { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowDown, ArrowUp, Edit, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IS_DEMO } from "@/api/transport";
import ConceptGalleryEditor from "./ConceptGalleryEditor";
import { validateConceptGallery } from "../../../server/src/conceptGallerySchema.js";

const slugify = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const blankItem = () => ({ title: "", slug: "", description: "", image: "", order: 0, features: [], sub_services: [] });

function ImageField({ label, value, onChange, onBusy, onError }) {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      onError("Choose a PNG, JPEG, or WEBP image smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    onBusy(1);
    onError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch {
      onError("The image could not be uploaded. Your changes are still here; please try again.");
    } finally {
      setUploading(false);
      onBusy(-1);
      event.target.value = "";
    }
  };
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Image URL" /><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-[var(--primary)]">{uploading ? "Uploading…" : "Upload image"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} className="max-w-[12rem] text-xs" onChange={upload} /></label>{value && <img src={value} alt={label + " preview"} className="mt-2 h-32 w-44 rounded-lg object-cover" />}</div>;
}

export default function CatalogueEditor({ client, queryKey, title, singular, route }) {
  const supportsGalleries = route === "PicYourConcept";
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [uploadCount, setUploadCount] = useState(0);
  const { data: items = [], isLoading, error, refetch } = useQuery({ queryKey: [queryKey], queryFn: () => client.list("order") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [queryKey] });
  const save = useMutation({
    mutationFn: (item) => item.id ? client.update(item.id, item) : client.create(item),
    onSuccess: async () => { await refresh(); setEditing(null); setMessage(singular + " saved successfully."); setFormError(""); },
    onError: (error) => setFormError(error?.name === "QuotaExceededError" ? "This browser is out of storage. Your draft is still here. Remove some uploaded photos or use image URLs, then save again." : error?.status === 409 ? "This concept changed in another session. Your draft is still here. Copy your changes before reloading the saved version." : "Saving failed. Your changes are still here. Please check your connection and try again."),
  });
  const remove = useMutation({
    mutationFn: (id) => client.delete(id),
    onSuccess: async () => { await refresh(); setMessage(singular + " deleted."); },
    onError: () => setFormError("This item could not be deleted. It may be in use or you may not have permission."),
  });
  const busy = uploadCount > 0 || save.isPending;
  const change = (key, value) => setEditing((current) => ({ ...current, [key]: value }));
  const setSection = (index, key, value) => setEditing((current) => ({ ...current, sub_services: current.sub_services.map((section, i) => i === index ? { ...section, [key]: typeof value === "function" ? value(section[key]) : value } : section) }));
  const moveSection = (index, direction) => setEditing((current) => {
    const sections = [...current.sub_services];
    const destination = index + direction;
    if (destination < 0 || destination >= sections.length) return current;
    [sections[index], sections[destination]] = [sections[destination], sections[index]];
    return { ...current, sub_services: sections };
  });
  const beginEditing = (item) => {
    setEditing(item ? { ...item, slug: item.slug || slugify(item.title), features: [...(item.features || [])], sub_services: (item.sub_services || []).map((section) => ({ ...section })) } : blankItem());
    setSlugEdited(Boolean(item)); setFormError(""); setMessage("");
  };
  const submit = (event) => {
    event.preventDefault(); setFormError("");
    if (busy) return;
    const slug = slugify(editing.slug || editing.title);
    if (!slug) return setFormError("Enter a web address name containing letters or numbers.");
    if (items.some((item) => String(item.id) !== String(editing.id) && slugify(item.slug || item.title) === slug)) return setFormError("This web address is already used. Choose a unique name.");
    try {
      save.mutate({ ...editing, slug, title: editing.title.trim(), description: editing.description.trim(), order: Number(editing.order) || 0, features: editing.features.map((feature) => feature.trim()).filter(Boolean), sub_services: editing.sub_services.map((section) => ({ ...section, title: section.title.trim(), description: section.description.trim(), image: (section.image || "").trim(), ...(supportsGalleries ? validateConceptGallery(section, { allowDataImages: IS_DEMO }) : {}) })) });
    } catch (error) { setFormError(error.message); }
  };

  return <div className="min-h-screen bg-gray-50 py-8 sm:py-12"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><Link to={createPageUrl("AdminDashboard")} className="rounded-md border bg-white p-3 text-[var(--primary)]" aria-label="Back to dashboard"><ArrowLeft size={20} /></Link><div><h1 className="text-3xl font-bold text-[var(--primary)]">{title}</h1><p className="mt-1 text-gray-600">Manage {items.length} {title.toLowerCase()} and their detail sections.</p></div></div><Button disabled={busy} onClick={() => beginEditing(null)}><Plus size={18} className="mr-2" />Add {singular}</Button></div>
    {message && <p role="status" className="mb-5 rounded-lg bg-green-50 p-4 text-green-800">{message}</p>}
    {formError && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800">{formError}</p>}
    {error && <div role="alert" className="mb-6 rounded-lg bg-red-50 p-4"><p className="mb-3">Could not load {title.toLowerCase()}.</p><Button onClick={() => refetch()}>Try again</Button></div>}

    {editing && <Card className="mb-8"><CardHeader><CardTitle>{editing.id ? "Edit " : "New "}{singular}</CardTitle></CardHeader><CardContent><form onSubmit={submit}><fieldset disabled={busy} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="catalogue-title">{singular} title *</Label><Input id="catalogue-title" required maxLength={180} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: slugEdited ? editing.slug : slugify(e.target.value) })} /></div><div className="space-y-2"><Label htmlFor="catalogue-slug">Web address name *</Label><Input id="catalogue-slug" required value={editing.slug} onChange={(e) => { setSlugEdited(true); change("slug", e.target.value); }} /><p className="break-all text-xs text-gray-500">/{route}/{slugify(editing.slug || editing.title)}</p></div></div>
      <div className="space-y-2"><Label htmlFor="catalogue-description">Description *</Label><Textarea id="catalogue-description" required rows={4} value={editing.description} onChange={(e) => change("description", e.target.value)} /></div>
      <div className="grid gap-5 sm:grid-cols-2"><ImageField label="Card image" value={editing.image} onChange={(value) => change("image", value)} onBusy={(delta) => setUploadCount((count) => count + delta)} onError={setFormError} /><div className="space-y-2"><Label htmlFor="catalogue-order">Display order</Label><Input id="catalogue-order" type="number" min={0} step={1} value={editing.order} onChange={(e) => change("order", e.target.value)} /></div></div>

      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-[var(--primary)]">Detail sections</h2><p className="text-sm text-gray-600">Alternating image and text sections on the public detail page.</p></div><Button type="button" variant="outline" onClick={() => change("sub_services", [...editing.sub_services, { title: "", image: "", description: "" }])}><Plus size={16} className="mr-2" />Add section</Button></div>
        {editing.sub_services.map((section, index) => <fieldset key={index} className="space-y-4 rounded-xl border bg-gray-50 p-4 sm:p-6"><legend className="px-2 font-semibold text-[var(--primary)]">Section {index + 1}</legend><div className="flex justify-end gap-2"><Button type="button" size="icon" variant="outline" aria-label={"Move section " + (index + 1) + " up"} disabled={index === 0 || busy} onClick={() => moveSection(index, -1)}><ArrowUp size={16} /></Button><Button type="button" size="icon" variant="outline" aria-label={"Move section " + (index + 1) + " down"} disabled={index === editing.sub_services.length - 1 || busy} onClick={() => moveSection(index, 1)}><ArrowDown size={16} /></Button><Button type="button" variant="outline" disabled={busy} onClick={() => change("sub_services", editing.sub_services.filter((_, i) => i !== index))}><Trash2 size={16} className="mr-2" />Remove</Button></div><div className="space-y-2"><Label htmlFor={"section-title-" + index}>Section title *</Label><Input id={"section-title-" + index} required value={section.title} onChange={(e) => setSection(index, "title", e.target.value)} /></div><div className="space-y-2"><Label htmlFor={"section-description-" + index}>Section description *</Label><Textarea id={"section-description-" + index} required rows={4} value={section.description} onChange={(e) => setSection(index, "description", e.target.value)} /></div><ImageField label={"Section " + (index + 1) + " image"} value={section.image} onChange={(value) => setSection(index, "image", value)} onBusy={(delta) => setUploadCount((count) => count + delta)} onError={setFormError} />{supportsGalleries && <ConceptGalleryEditor section={section} onChange={(key, value) => setSection(index, key, value)} onBusy={(delta) => setUploadCount((count) => count + delta)} onError={setFormError} />}</fieldset>)}
      </section>

      <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-[var(--primary)]">Features (optional)</h2><Button type="button" variant="outline" onClick={() => change("features", [...editing.features, ""])}><Plus size={16} className="mr-2" />Add feature</Button></div>{editing.features.map((feature, index) => <div key={index} className="flex gap-2"><Input aria-label={"Feature " + (index + 1)} value={feature} onChange={(e) => change("features", editing.features.map((value, i) => i === index ? e.target.value : value))} /><Button type="button" size="icon" variant="outline" aria-label={"Remove feature " + (index + 1)} onClick={() => change("features", editing.features.filter((_, i) => i !== index))}><Trash2 size={16} /></Button></div>)}</section>
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}>{save.isPending ? "Saving…" : uploadCount ? "Uploading…" : "Save " + singular}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button></div>
    </fieldset></form></CardContent></Card>}

    {isLoading && <p role="status" className="py-12 text-center text-gray-600">Loading {title.toLowerCase()}…</p>}
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <Card key={item.id}><img src={item.image} alt="" loading="lazy" className="h-44 w-full rounded-t-lg object-cover" /><CardContent className="p-5"><h2 className="text-xl font-bold text-[var(--primary)]">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">{item.description}</p><p className="mt-3 text-xs text-gray-500">{item.sub_services?.length || 0} detail sections</p><div className="mt-5 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => beginEditing(item)}><Edit size={15} className="mr-2" />Edit</Button><Button size="sm" variant="outline" disabled={remove.isPending || busy} onClick={() => { if (window.confirm("Delete “" + item.title + "”? This removes it from the public catalogue.")) remove.mutate(item.id); }}><Trash2 size={15} className="mr-2" />Delete</Button><Link to={createPageUrl(route + "/" + (item.slug || slugify(item.title)))} className="inline-flex items-center rounded-md px-3 text-sm font-medium text-[var(--primary)] underline">View</Link></div></CardContent></Card>)}</div>
    {!isLoading && !error && !items.length && <p className="py-16 text-center text-gray-600">No items yet. Add your first {singular.toLowerCase()} to get started.</p>}
  </div></div>;
}
