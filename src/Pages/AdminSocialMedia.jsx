import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { contactInfoClient } from "@/api/contactInfoClient";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSocialMedia() {
  const queryClient = useQueryClient();
  const { data: contacts = [], isLoading, error } = useQuery({ queryKey: ["contactInfo"], queryFn: () => contactInfoClient.list() });
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [saveError, setSaveError] = useState("");
  const contact = contacts[0];
  useEffect(() => {
    const entries = contact?.social_links
      ? Object.entries(contact.social_links).map(([platform, url]) => ({ platform, url }))
      : (contact?.social_media || []).map((item) => ({ platform: item.platform || item.name || "", url: item.url || "" }));
    setRows(entries);
  }, [contact]);
  const save = useMutation({
    mutationFn: (links) => contactInfoClient.update(contact.id, { ...contact, social_links: links }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["contactInfo"] }); window.dispatchEvent(new Event("d16-branding-refresh")); setStatus("Social media links saved."); },
    onError: () => setSaveError("The links could not be saved. Your changes are still here; please try again."),
  });
  const submit = (event) => {
    event.preventDefault(); setSaveError(""); setStatus("");
    const entries = [];
    const names = new Set();
    for (const row of rows) {
      const name = row.platform.trim();
      const url = row.url.trim();
      if (!name && !url) continue;
      if (!name || !url) return setSaveError("Each profile needs a platform name and a full website URL.");
      if (names.has(name.toLowerCase())) return setSaveError("Each platform name must be unique.");
      try { if (!["https:", "http:"].includes(new URL(url).protocol)) throw new Error(); }
      catch { return setSaveError("Use a complete https:// or http:// address for every profile."); }
      names.add(name.toLowerCase());
      entries.push([name, url]);
    }
    save.mutate(Object.fromEntries(entries));
  };
  const setRow = (index, key, value) => setRows((current) => current.map((row, i) => i === index ? { ...row, [key]: value } : row));

  return <div className="min-h-screen bg-gray-50 py-8 sm:py-12"><div className="mx-auto max-w-4xl px-4 sm:px-6">
    <div className="mb-8 flex items-center gap-4"><Link to={createPageUrl("AdminDashboard")} className="rounded-md border bg-white p-3 text-[var(--primary)]" aria-label="Back to dashboard"><ArrowLeft size={20} /></Link><div><h1 className="text-3xl font-bold text-[var(--primary)]">Social Media Management</h1><p className="mt-1 text-gray-600">Add, edit, or remove social profiles shown in the footer.</p></div></div>
    {isLoading && <p role="status">Loading social profiles…</p>}
    {error && <p role="alert" className="mb-5 text-red-700">Could not load contact settings. Please refresh and try again.</p>}
    {status && <p role="status" className="mb-5 rounded-lg bg-green-50 p-4 text-green-800">{status}</p>}
    {saveError && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800">{saveError}</p>}
    <Card><CardHeader><CardTitle>Social accounts</CardTitle></CardHeader><CardContent><form onSubmit={submit}><fieldset disabled={!contact || save.isPending} className="space-y-5">
      {rows.length === 0 && <p className="rounded-lg bg-gray-50 p-6 text-center text-gray-600">No social profiles added yet. Add the accounts you would like visitors to find.</p>}
      {rows.map((row, index) => <div key={index} className="grid items-end gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_2fr_auto]"><div className="space-y-2"><Label htmlFor={"platform-" + index}>Platform</Label><Input id={"platform-" + index} value={row.platform} maxLength={40} placeholder="e.g. YouTube" onChange={(e) => setRow(index, "platform", e.target.value)} /></div><div className="space-y-2"><Label htmlFor={"profile-url-" + index}>Profile URL</Label><Input id={"profile-url-" + index} type="url" value={row.url} placeholder="https://…" onChange={(e) => setRow(index, "url", e.target.value)} /></div><Button type="button" variant="outline" aria-label={"Remove " + (row.platform || "profile " + (index + 1))} onClick={() => setRows(rows.filter((_, i) => i !== index))}><Trash2 size={18} /><span className="ml-2 sm:sr-only">Remove</span></Button></div>)}
      <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={() => setRows([...rows, { platform: "", url: "" }])}><Plus size={18} className="mr-2" />Add Link</Button><Button type="submit">{save.isPending ? "Saving…" : "Save Social Media Links"}</Button></div>
    </fieldset></form></CardContent></Card>
  </div></div>;
}
