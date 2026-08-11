
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { projectsClient } from "@/api/projectsClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Upload, ArrowLeft, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminProjects() {
  const queryClient = useQueryClient();
  const [editingProject, setEditingProject] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsClient.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => projectsClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setEditingProject(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => projectsClient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setEditingProject(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => projectsClient.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['projects'])
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditingProject({ ...editingProject, featured_image: file_url });
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProject.id) {
      updateMutation.mutate({ id: editingProject.id, data: editingProject });
    } else {
      createMutation.mutate(editingProject);
    }
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
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Projects</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage portfolio projects</p>
            </div>
          </div>
          <Button 
            onClick={() => setEditingProject({ 
              title: '', 
              location: '', 
              project_type: '', 
              style: '', 
              area: '', 
              category: '', 
              featured_image: '', 
              description: '',
              featured: false
            })}
            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto"
          >
            <Plus className="mr-2" size={20} />
            Add Project
          </Button>
        </div>

        {editingProject && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{editingProject.id ? 'Edit Project' : 'New Project'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      value={editingProject.title}
                      onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={editingProject.location}
                      onChange={(e) => setEditingProject({ ...editingProject, location: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={editingProject.category} onValueChange={(value) => setEditingProject({ ...editingProject, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="restaurant_cafe">Restaurant & Cafe</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project_type">Project Type</Label>
                    <Input
                      id="project_type"
                      value={editingProject.project_type}
                      onChange={(e) => setEditingProject({ ...editingProject, project_type: e.target.value })}
                      placeholder="e.g., Residential Apartment"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="style">Style</Label>
                    <Input
                      id="style"
                      value={editingProject.style}
                      onChange={(e) => setEditingProject({ ...editingProject, style: e.target.value })}
                      placeholder="e.g., Modern Luxury"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Area</Label>
                  <Input
                    id="area"
                    value={editingProject.area}
                    onChange={(e) => setEditingProject({ ...editingProject, area: e.target.value })}
                    placeholder="e.g., 2500 sqft"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingProject.description}
                    onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featured_image">Featured Image *</Label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Input
                      id="featured_image"
                      value={editingProject.featured_image}
                      onChange={(e) => setEditingProject({ ...editingProject, featured_image: e.target.value })}
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
                  {editingProject.featured_image && (
                    <img 
                      src={editingProject.featured_image} 
                      alt="Preview" 
                      className="mt-2 h-32 sm:h-40 w-full sm:w-auto rounded-lg object-cover" 
                    />
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingProject.featured}
                    onCheckedChange={(checked) => setEditingProject({ ...editingProject, featured: checked })}
                  />
                  <Label>Featured on Homepage</Label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto">
                    {editingProject.id ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingProject(null)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((project) => (
            <Card key={project.id}>
              <div className="relative h-40 sm:h-48">
                <img src={project.featured_image} alt={project.title} className="w-full h-full object-cover rounded-t-lg" />
                {project.featured && (
                  <div className="absolute top-2 right-2 bg-[var(--accent)] text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                    Featured
                  </div>
                )}
              </div>
              <CardContent className="pt-4">
                <h3 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2">{project.title}</h3>
                <p className="text-sm text-gray-600 mb-1">{project.location}</p>
                <p className="text-sm text-gray-500 mb-4">{project.category?.replace(/_/g, ' ')}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingProject(project)}
                    className="w-full sm:w-auto"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(project.id)}
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

        {projects.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No projects yet. Add your first project!</p>
          </div>
        )}
      </div>
    </div>
  );
}
