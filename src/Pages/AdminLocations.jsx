import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { contactInfoClient } from "@/api/contactInfoClient";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdminLocations() {
  const queryClient = useQueryClient();
  const { data: contacts = [] } = useQuery({ queryKey: ["contactInfo"], queryFn: () => contactInfoClient.list() });
  const [locations, setLocations] = useState([]);
  const contact = contacts[0];
  useEffect(() => setLocations(contact?.locations || []), [contact]);
  const save = useMutation({ mutationFn: () => contactInfoClient.update(contact.id, { ...contact, locations }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contactInfo"] }); window.dispatchEvent(new Event("d16-branding-refresh")); } });
  return <div className="min-h-screen bg-gray-50 py-8 sm:py-12"><div className="mx-auto max-w-3xl px-4 sm:px-6"><div className="mb-8 flex items-center gap-4"><Link to={createPageUrl("AdminDashboard")}><Button variant="outline" size="icon"><ArrowLeft size={20} /></Button></Link><div><h1 className="text-3xl font-bold text-[var(--primary)]">Locations</h1><p className="text-gray-600">Manage the cities shown in the website footer.</p></div></div><Card><CardHeader><CardTitle>Office locations</CardTitle></CardHeader><CardContent className="space-y-4">{locations.map((location, index) => <div className="flex gap-2" key={index}><Input value={location} aria-label={`Location ${index + 1}`} onChange={(e) => setLocations(locations.map((item, i) => i === index ? e.target.value : item))} /><Button variant="outline" size="icon" aria-label={`Remove ${location}`} onClick={() => setLocations(locations.filter((_, i) => i !== index))}><Trash2 size={17} /></Button></div>)}<Button type="button" variant="outline" onClick={() => setLocations([...locations, ""])}><Plus className="mr-2" size={17} />Add location</Button><div><Button disabled={!contact || save.isPending} onClick={() => save.mutate()} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]">Save locations</Button></div></CardContent></Card></div></div>;
}
