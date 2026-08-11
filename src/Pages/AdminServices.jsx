
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { servicesClient } from "@/api/servicesClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Upload, ArrowLeft, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminServices() {
  const queryClient = useQueryClient();
  const [editingService, setEditingService] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesClient.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => servicesClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setEditingService(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => servicesClient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setEditingService(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => servicesClient.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditingService({ ...editingService, image: file_url });
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingService.id) {
      updateMutation.mutate({ id: editingService.id, data: editingService });
    } else {
      createMutation.mutate(editingService);
    }
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...(editingService.features || [])];
    newFeatures[index] = value;
    setEditingService({ ...editingService, features: newFeatures });
  };

  const addFeature = () => {
    setEditingService({
      ...editingService,
      features: [...(editingService.features || []), '']
    });
  };

  const removeFeature = (index) => {
    const newFeatures = editingService.features.filter((_, i) => i !== index);
    setEditingService({ ...editingService, features: newFeatures });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to={createPageUrl("AdminDashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Services</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage service offerings</p>
            </div>
          </div>
          <Button 
            onClick={() => setEditingService({ title: '', description: '', image: '', features: [], order: 0 })}
            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto"
          >
            <Plus className="mr-2" size={20} />
            Add Service
          </Button>
        </div>

        {editingService && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{editingService.id ? 'Edit Service' : 'New Service'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={editingService.title}
                      onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={editingService.order}
                      onChange={(e) => setEditingService({ ...editingService, order: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={editingService.description}
                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    required
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Service Image</Label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Input
                      id="image"
                      value={editingService.image || ''}
                      onChange={(e) => setEditingService({ ...editingService, image: e.target.value })}
                      placeholder="Image URL"
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
                  {editingService.image && (
                    <img 
                      src={editingService.image} 
                      alt="Preview" 
                      className="mt-2 h-32 sm:h-40 w-full sm:w-auto rounded-lg object-cover" 
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Features (optional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                      <Plus size={16} className="mr-1" />
                      Add Feature
                    </Button>
                  </div>
                  {editingService.features?.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder="Feature description"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => removeFeature(index)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto">
                    {editingService.id ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingService(null)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {services.map((service) => (
            <Card key={service.id}>
              {service.image && (
                <div className="relative h-40 sm:h-48">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover rounded-t-lg" />
                </div>
              )}
              <CardContent className="pt-4">
                <h3 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2">{service.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-3">{service.description}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingService(service)}
                    className="w-full sm:w-auto"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(service.id)}
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

        {services.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No services yet. Add your first service!</p>
          </div>
        )}
      </div>
    </div>
  );
}
