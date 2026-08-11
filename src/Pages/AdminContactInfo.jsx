import React, { useState } from "react";
import { contactInfoClient } from "@/api/contactInfoClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft, RefreshCw, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminContactInfo() {
  const queryClient = useQueryClient();
  const [actionStatus, setActionStatus] = useState("");
  const [actionError, setActionError] = useState("");

  const { data: contactInfo = [], isLoading } = useQuery({
    queryKey: ['contactInfo'],
    queryFn: () => contactInfoClient.list()
  });

  const [formData, setFormData] = useState(
    contactInfo[0] || {
      phone: '',
      email: '',
      address: '',
      working_hours: '',
      locations: [],
      logo_url: ''
    }
  );

  React.useEffect(() => {
    if (contactInfo[0]) {
      setFormData(contactInfo[0]);
    }
  }, [contactInfo]);

  const broadcastBrandingRefresh = () => {
    const signal = { ts: Date.now() };
    localStorage.setItem("d16_branding_refresh", JSON.stringify(signal));
    window.dispatchEvent(new CustomEvent("d16-branding-refresh", { detail: signal }));
  };

  const createMutation = useMutation({
    mutationFn: (data) => contactInfoClient.create(data),
    onSuccess: () => queryClient.invalidateQueries(['contactInfo'])
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => contactInfoClient.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['contactInfo'])
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-600">Loading contact information...</p>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setActionStatus("");
    setActionError("");

    if (formData.id) {
      updateMutation.mutate(
        { id: formData.id, data: formData },
        {
          onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["contactInfo"] });
            broadcastBrandingRefresh();
            setActionStatus("Contact information saved successfully.");
          },
          onError: () => {
            setActionError("Saving failed. Please try again.");
          }
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["contactInfo"] });
          broadcastBrandingRefresh();
          setActionStatus("Contact information saved successfully.");
        },
        onError: () => {
          setActionError("Saving failed. Please try again.");
        }
      });
    }
  };

  const handleRefreshBrandingCache = async () => {
    setActionStatus("");
    setActionError("");

    try {
      await queryClient.invalidateQueries({ queryKey: ["contactInfo"] });
      broadcastBrandingRefresh();
      setActionStatus("Branding cache refresh triggered for current and open tabs.");
    } catch (error) {
      console.error("Branding refresh error:", error);
      setActionError("Branding cache refresh failed. Please try again.");
    }
  };

  const handleLocationChange = (index, value) => {
    const newLocations = [...(formData.locations || [])];
    newLocations[index] = value;
    setFormData({ ...formData, locations: newLocations });
  };

  const addLocation = () => {
    setFormData({
      ...formData,
      locations: [...(formData.locations || []), '']
    });
  };

  const removeLocation = (index) => {
    const newLocations = formData.locations.filter((_, i) => i !== index);
    setFormData({ ...formData, locations: newLocations });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
          <Link to={createPageUrl("AdminDashboard")}>
            <Button variant="outline" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Contact Information</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage company contact details</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+880 1711-288948"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@d16interior.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Main office address"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="working_hours">Working Hours</Label>
                <Input
                  id="working_hours"
                  value={formData.working_hours}
                  onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
                  placeholder="Mon - Sat: 9:00 AM - 6:00 PM"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo Image URL</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url || ''}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://.../logo.png"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Office Locations</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLocation}>
                    <Plus size={16} className="mr-1" />
                    Add Location
                  </Button>
                </div>
                {formData.locations?.map((location, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={location}
                      onChange={(e) => handleLocationChange(index, e.target.value)}
                      placeholder="City name"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => removeLocation(index)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>

              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              {actionStatus && <p className="text-sm text-green-600">{actionStatus}</p>}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto">
                  <Save className="mr-2" size={18} />
                  Save Contact Information
                </Button>
                <Button type="button" variant="outline" onClick={handleRefreshBrandingCache} className="w-full sm:w-auto">
                  <RefreshCw className="mr-2" size={18} />
                  Refresh Branding Cache
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
