import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Save, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { contactInfoClient } from "@/api/contactInfoClient";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FALLBACK_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690395669c778d5c32d51682/5ac5acb53_image.png";

export default function AdminLogo() {
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const broadcastBrandingRefresh = () => {
    const signal = { ts: Date.now() };
    localStorage.setItem("d16_branding_refresh", JSON.stringify(signal));
    window.dispatchEvent(new CustomEvent("d16-branding-refresh", { detail: signal }));
  };

  const { data: contactInfo = [], isLoading } = useQuery({
    queryKey: ["contactInfo"],
    queryFn: () => contactInfoClient.list()
  });

  const existingContact = contactInfo[0];

  useEffect(() => {
    setLogoUrl(existingContact?.logo_url || "");
    setPreviewUrl(existingContact?.logo_url || "");
    setUploadError("");
    setSaveStatus("");
    setSaveError("");
  }, [existingContact]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const createMutation = useMutation({
    mutationFn: (data) => contactInfoClient.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contactInfo"] });
      broadcastBrandingRefresh();
      setSaveStatus("Logo saved successfully.");
      setSaveError("");
    },
    onError: () => {
      setSaveError("Saving failed. Please try again.");
      setSaveStatus("");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => contactInfoClient.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contactInfo"] });
      broadcastBrandingRefresh();
      setSaveStatus("Logo saved successfully.");
      setSaveError("");
    },
    onError: () => {
      setSaveError("Saving failed. Please try again.");
      setSaveStatus("");
    }
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const previewSrc = previewUrl || logoUrl || FALLBACK_LOGO_URL;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp"];
    const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!hasValidExtension || file.size > 5 * 1024 * 1024) {
      setUploadError("Use a PNG, JPG, JPEG, or WEBP image smaller than 5 MB. Export design files as an image first.");
      return;
    }

    setUploadError("");
    setSaveError("");
    setSaveStatus("");
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));

    setUploading(true);
    try {
      // Always upload selected local files and save URL, which avoids local storage quota issues.
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLogoUrl(file_url);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Upload failed. Please try another file.");
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveStatus("");
    setSaveError("");

    if (!logoUrl) {
      setSaveError("Please upload or enter a logo before saving.");
      return;
    }

    if (existingContact?.id) {
      updateMutation.mutate({
        id: existingContact.id,
        data: {
          ...existingContact,
          logo_url: logoUrl
        }
      });
      return;
    }

    createMutation.mutate({
      phone: "+880 1711 288948",
      email: "info@d16interior.com",
      address: "",
      working_hours: "",
      locations: ["Dhaka", "Chittagong", "Sylhet", "Rajshahi"],
      logo_url: logoUrl
    });
  };

  const handleRefreshBrandingCache = async () => {
    setSaveStatus("");
    setSaveError("");

    try {
      await queryClient.invalidateQueries({ queryKey: ["contactInfo"] });
      broadcastBrandingRefresh();
      setSaveStatus("Branding cache refresh triggered for current and open tabs.");
    } catch (error) {
      console.error("Branding refresh error:", error);
      setSaveError("Branding cache refresh failed. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-600">Loading logo settings...</p>
      </div>
    );
  }

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
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Logo Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Update your brand logo used in header and footer across the site
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Website Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo Image URL</Label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Input
                    id="logo_url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById("logo-file-upload").click()}
                    className="w-full sm:w-auto"
                  >
                    <Upload className="mr-2" size={16} />
                    {uploading ? "Uploading..." : "Upload Local"}
                  </Button>
                  <input
                    id="logo-file-upload"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                {saveStatus && <p className="text-sm text-green-600">{saveStatus}</p>}
              </div>

              <div className="rounded-lg border border-gray-200 bg-[var(--primary)] p-4">
                <p className="text-sm font-medium text-white mb-3">Preview on the header background</p>
                  <img
                    src={previewSrc}
                    alt="Logo preview"
                    className="h-20 w-auto"
                  />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto" disabled={isSaving || uploading}>
                  <Save className="mr-2" size={18} />
                  {isSaving ? "Saving..." : "Save Logo"}
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
