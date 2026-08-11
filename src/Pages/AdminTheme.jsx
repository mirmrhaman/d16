import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Palette, RefreshCw, Save } from "lucide-react";
import { contactInfoClient } from "@/api/contactInfoClient";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_THEME_COLOR = "#1e3a5f";

const normalizeHex = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed)) return "";
  const full = trimmed.length === 3 ? trimmed.split("").map((c) => c + c).join("") : trimmed;
  return `#${full.toLowerCase()}`;
};

const hexToRgb = (hex) => {
  const safeHex = normalizeHex(hex).slice(1);
  return {
    r: parseInt(safeHex.slice(0, 2), 16),
    g: parseInt(safeHex.slice(2, 4), 16),
    b: parseInt(safeHex.slice(4, 6), 16),
  };
};

const rgbToHex = (r, g, b) => {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixHex = (hexA, hexB, ratio = 0.5) => {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r + (b.r - a.r) * clampedRatio,
    a.g + (b.g - a.g) * clampedRatio,
    a.b + (b.b - a.b) * clampedRatio
  );
};

export default function AdminTheme() {
  const queryClient = useQueryClient();
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState("");

  const broadcastBrandingRefresh = () => {
    const signal = { ts: Date.now() };
    localStorage.setItem("d16_branding_refresh", JSON.stringify(signal));
    window.dispatchEvent(new CustomEvent("d16-branding-refresh", { detail: signal }));
  };

  const { data: contactInfo = [], isLoading } = useQuery({
    queryKey: ["contactInfo"],
    queryFn: () => contactInfoClient.list(),
  });

  const existingContact = contactInfo[0];

  useEffect(() => {
    setThemeColor(normalizeHex(existingContact?.theme_color) || DEFAULT_THEME_COLOR);
    setSaveStatus("");
    setSaveError("");
  }, [existingContact]);

  const createMutation = useMutation({
    mutationFn: (data) => contactInfoClient.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contactInfo"] });
      broadcastBrandingRefresh();
      setSaveStatus("Theme color saved successfully.");
      setSaveError("");
    },
    onError: () => {
      setSaveError("Saving failed. Please try again.");
      setSaveStatus("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => contactInfoClient.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contactInfo"] });
      broadcastBrandingRefresh();
      setSaveStatus("Theme color saved successfully.");
      setSaveError("");
    },
    onError: () => {
      setSaveError("Saving failed. Please try again.");
      setSaveStatus("");
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const previewColors = useMemo(() => {
    const base = normalizeHex(themeColor) || DEFAULT_THEME_COLOR;
    return {
      primary: base,
      dark: mixHex(base, "#000000", 0.25),
      accent: mixHex(base, "#ffffff", 0.35),
      light: mixHex(base, "#ffffff", 0.88),
    };
  }, [themeColor]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveStatus("");
    setSaveError("");

    const normalized = normalizeHex(themeColor);
    if (!normalized) {
      setSaveError("Please provide a valid HEX color like #1e3a5f.");
      return;
    }

    if (existingContact?.id) {
      updateMutation.mutate({
        id: existingContact.id,
        data: {
          ...existingContact,
          theme_color: normalized,
        },
      });
      return;
    }

    createMutation.mutate({
      phone: "+880 1711 288948",
      email: "info@d16interior.com",
      address: "",
      working_hours: "",
      locations: ["Dhaka", "Chittagong", "Sylhet", "Rajshahi"],
      theme_color: normalized,
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
        <p className="text-gray-600">Loading theme settings...</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Theme Color</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Change the basic brand color used across the site layout
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Brand Color Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme_color">Base Color</Label>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Input
                    id="theme_color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    placeholder="#1e3a5f"
                    className="flex-1"
                  />
                  <input
                    type="color"
                    value={normalizeHex(themeColor) || DEFAULT_THEME_COLOR}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                    aria-label="Pick base color"
                  />
                </div>
                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                {saveStatus && <p className="text-sm text-green-600">{saveStatus}</p>}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Preview</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-md p-3 text-white text-sm" style={{ backgroundColor: previewColors.primary }}>
                    Primary
                  </div>
                  <div className="rounded-md p-3 text-white text-sm" style={{ backgroundColor: previewColors.dark }}>
                    Dark
                  </div>
                  <div className="rounded-md p-3 text-sm" style={{ backgroundColor: previewColors.accent }}>
                    Accent
                  </div>
                  <div className="rounded-md p-3 text-sm" style={{ backgroundColor: previewColors.light }}>
                    Light
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto" disabled={isSaving}>
                  <Save className="mr-2" size={18} />
                  {isSaving ? "Saving..." : "Save Theme Color"}
                </Button>
                <Button type="button" variant="outline" onClick={handleRefreshBrandingCache} className="w-full sm:w-auto">
                  <RefreshCw className="mr-2" size={18} />
                  Refresh Branding Cache
                </Button>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 flex items-start gap-2">
                <Palette size={16} className="mt-0.5" />
                <p>
                  This updates the global site brand variables used by the header, footer, and primary layout accents.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
