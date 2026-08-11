
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Upload, ArrowLeft, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminHeroSlides() {
  const queryClient = useQueryClient();
  const [editingSlide, setEditingSlide] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: () => base44.entities.HeroSlide.list('order')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HeroSlide.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['heroSlides']);
      setEditingSlide(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HeroSlide.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['heroSlides']);
      setEditingSlide(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HeroSlide.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['heroSlides'])
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditingSlide({ ...editingSlide, image: file_url });
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSlide.id) {
      updateMutation.mutate({ id: editingSlide.id, data: editingSlide });
    } else {
      createMutation.mutate(editingSlide);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to={createPageUrl("AdminDashboard")}>
              <Button variant="outline" size="icon" className="shrink-0">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Hero Slides</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage homepage carousel slides</p>
            </div>
          </div>
          <Button 
            onClick={() => setEditingSlide({ title: '', subtitle: '', image: '', order: 0, active: true })}
            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto"
          >
            <Plus className="mr-2" size={20} />
            Add Slide
          </Button>
        </div>

        {editingSlide && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{editingSlide.id ? 'Edit Slide' : 'New Slide'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={editingSlide.title}
                      onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={editingSlide.order}
                      onChange={(e) => setEditingSlide({ ...editingSlide, order: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle *</Label>
                  <Textarea
                    id="subtitle"
                    value={editingSlide.subtitle}
                    onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                    required
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Background Image *</Label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Input
                      id="image"
                      value={editingSlide.image}
                      onChange={(e) => setEditingSlide({ ...editingSlide, image: e.target.value })}
                      placeholder="Image URL"
                      required
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={uploading} 
                      onClick={() => document.getElementById('file-upload').click()}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="mr-2" size={16} />
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  {editingSlide.image && (
                    <img 
                      src={editingSlide.image} 
                      alt="Preview" 
                      className="mt-2 h-32 sm:h-40 w-full sm:w-auto rounded-lg object-cover" 
                    />
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingSlide.active}
                    onCheckedChange={(checked) => setEditingSlide({ ...editingSlide, active: checked })}
                  />
                  <Label>Active</Label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto">
                    {editingSlide.id ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingSlide(null)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {slides.map((slide) => (
            <Card key={slide.id}>
              <div className="relative h-40 sm:h-48">
                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover rounded-t-lg" />
                {!slide.active && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                    Inactive
                  </div>
                )}
              </div>
              <CardContent className="pt-4">
                <h3 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2">{slide.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-2">{slide.subtitle}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSlide(slide)}
                    className="w-full sm:w-auto"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(slide.id)}
                    className="w-full sm:w-auto text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {slides.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No hero slides yet. Add your first slide to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
