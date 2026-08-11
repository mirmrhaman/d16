import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const sections = [
  { key: "HeroSlides", label: "Hero Slides" },
  { key: "Stats", label: "Statistics" },
  { key: "Services", label: "Services" },
  { key: "Projects", label: "Projects" },
  { key: "Blog", label: "Blog" },
];

export default function AdminAccessControl() {
  const queryClient = useQueryClient();
  const { data: access = [], isLoading } = useQuery({
    queryKey: ['accessControl'],
    queryFn: () => base44.entities.AccessControl.list()
  });
  const record = access[0];
  const [allowed, setAllowed] = useState(record?.allowed_sections || []);

  useEffect(() => {
    if (record?.allowed_sections) {
      setAllowed(record.allowed_sections);
    }
  }, [record]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AccessControl.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['accessControl'])
  });

  const toggleSection = (key) => {
    setAllowed((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    if (!record?.id) return;
    updateMutation.mutate({
      id: record.id,
      data: { ...record, allowed_sections: allowed },
    });
  };

  if (isLoading || !record) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-600">Loading access settings...</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Super User Access</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Choose which sections Super Users can edit</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-[var(--accent-light)]">
              <Shield className="text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle>Allowed Sections</CardTitle>
              <p className="text-sm text-gray-600">Super Users will only see and edit these sections</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sections.map((section) => (
              <label
                key={section.key}
                className="flex items-center justify-between border rounded-lg px-4 py-3 hover:border-[var(--accent)]/60 transition-colors"
              >
                <div>
                  <p className="font-semibold text-[var(--primary)]">{section.label}</p>
                  <p className="text-sm text-gray-600">Access to edit {section.label}</p>
                </div>
                  <input
                    type="checkbox"
                    checked={allowed.includes(section.key)}
                    onChange={() => toggleSection(section.key)}
                    className="h-5 w-5 accent-[var(--primary)]"
                />
              </label>
            ))}

            <Button
              onClick={handleSave}
              className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto"
              disabled={updateMutation.isLoading}
            >
              <Save className="mr-2" size={18} />
              {updateMutation.isLoading ? 'Saving...' : 'Save Permissions'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
