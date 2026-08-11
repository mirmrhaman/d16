import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Upload, ArrowLeft, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminGallery() {
  const queryClient = useQueryClient();
  const [editingVideo, setEditingVideo] = useState(null);
  const [editingConcept, setEditingConcept] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");

  // Fetch videos
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['galleryVideos'],
    queryFn: () => base44.entities.GalleryVideo.list('id')
  });

  // Fetch concepts
  const { data: concepts = [], isLoading: conceptsLoading } = useQuery({
    queryKey: ['galleryConcepts'],
    queryFn: () => base44.entities.GalleryConcept.list('order')
  });

  // Video mutations
  const createVideoMutation = useMutation({
    mutationFn: (data) => base44.entities.GalleryVideo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['galleryVideos']);
      setEditingVideo(null);
    }
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GalleryVideo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['galleryVideos']);
      setEditingVideo(null);
    }
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id) => base44.entities.GalleryVideo.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['galleryVideos'])
  });

  // Concept mutations
  const createConceptMutation = useMutation({
    mutationFn: (data) => base44.entities.GalleryConcept.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['galleryConcepts']);
      setEditingConcept(null);
    }
  });

  const updateConceptMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GalleryConcept.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['galleryConcepts']);
      setEditingConcept(null);
    }
  });

  const deleteConceptMutation = useMutation({
    mutationFn: (id) => base44.entities.GalleryConcept.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['galleryConcepts'])
  });

  // Image upload handler
  const handleImageUpload = async (e, target, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (target === 'video') {
        setEditingVideo({ ...editingVideo, [field]: file_url });
      } else {
        setEditingConcept({ ...editingConcept, [field]: file_url });
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

    // Video handlers
  const handleVideoSubmit = (e) => {
    e.preventDefault();
    if (editingVideo.id) {
      updateVideoMutation.mutate({ id: editingVideo.id, data: editingVideo });
    } else {
      createVideoMutation.mutate(editingVideo);
    }
  };

  const handleVideoFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditingVideo({ ...editingVideo, video_url: file_url });
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

  // Concept handlers
  const handleConceptSubmit = (e) => {
    e.preventDefault();
    if (editingConcept.id) {
      updateConceptMutation.mutate({ id: editingConcept.id, data: editingConcept });
    } else {
      createConceptMutation.mutate(editingConcept);
    }
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...(editingConcept.features || [])];
    newFeatures[index] = value;
    setEditingConcept({ ...editingConcept, features: newFeatures });
  };

  const addFeature = () => {
    setEditingConcept({
      ...editingConcept,
      features: [...(editingConcept.features || []), '']
    });
  };

  const removeFeature = (index) => {
    const newFeatures = editingConcept.features.filter((_, i) => i !== index);
    setEditingConcept({ ...editingConcept, features: newFeatures });
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
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Gallery</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage gallery videos and concepts</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="videos">
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="concepts">
              Concepts ({concepts.length})
            </TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos">
            {/* Add Video Button */}
            <div className="mb-6">
              <Button 
                onClick={() => setEditingVideo({ title: '', thumbnail: '', video_url: '', duration: '', category: '' })}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
              >
                <Plus className="mr-2" size={20} />
                Add Video
              </Button>
            </div>

            {/* Video Form */}
            {editingVideo && (
              <Card className="mb-6 sm:mb-8">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">{editingVideo.id ? 'Edit Video' : 'New Video'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVideoSubmit} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="video-title">Title *</Label>
                        <Input
                          id="video-title"
                          value={editingVideo.title}
                          onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="video-category">Category</Label>
                        <Input
                          id="video-category"
                          value={editingVideo.category}
                          onChange={(e) => setEditingVideo({ ...editingVideo, category: e.target.value })}
                          placeholder="e.g., Residential, Commercial"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="video-duration">Duration</Label>
                        <Input
                          id="video-duration"
                          value={editingVideo.duration}
                          onChange={(e) => setEditingVideo({ ...editingVideo, duration: e.target.value })}
                          placeholder="e.g., 4:32"
                        />
                      </div>
                    </div>

                    {/* Video URL or Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="video-url">Video URL</Label>
                      <Input
                        id="video-url"
                        value={editingVideo.video_url || ''}
                        onChange={(e) => setEditingVideo({ ...editingVideo, video_url: e.target.value })}
                        placeholder="YouTube/Vimeo embed URL or direct video link"
                      />
                      <p className="text-sm text-gray-500">Or upload a video file below</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Video File</Label>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          disabled={uploading} 
                          onClick={() => document.getElementById('video-file-upload').click()}
                          className="w-full sm:w-auto"
                        >
                          <Upload className="mr-2" size={16} />
                          {uploading ? 'Uploading...' : 'Upload Video'}
                        </Button>
                        <input
                          id="video-file-upload"
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={handleVideoFileChange}
                        />
                      </div>
                      {editingVideo.video_url && (
                        <p className="text-sm text-green-600 mt-2">Video uploaded: {editingVideo.video_url}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="video-thumbnail">Thumbnail Image *</Label>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Input
                          id="video-thumbnail"
                          value={editingVideo.thumbnail}
                          onChange={(e) => setEditingVideo({ ...editingVideo, thumbnail: e.target.value })}
                          placeholder="Image URL"
                          required
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          disabled={uploading} 
                          onClick={() => document.getElementById('video-thumb-upload').click()}
                          className="w-full sm:w-auto"
                        >
                          <Upload className="mr-2" size={16} />
                          {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                        <input
                          id="video-thumb-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'video', 'thumbnail')}
                        />
                      </div>
                      {editingVideo.thumbnail && (
                        <img 
                          src={editingVideo.thumbnail} 
                          alt="Preview" 
                          className="mt-2 h-32 sm:h-40 w-full sm:w-auto rounded-lg object-cover" 
                        />
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto">
                        {editingVideo.id ? 'Update' : 'Create'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingVideo(null)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Videos List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {videos.map((video) => (
                <Card key={video.id}>
                  {video.thumbnail && (
                    <div className="relative h-40 sm:h-48">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover rounded-t-lg" />
                    </div>
                  )}
                  <CardContent className="pt-4">
                    <h3 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2">{video.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      {video.category && <span className="bg-[var(--accent-light)] px-2 py-1 rounded">{video.category}</span>}
                      {video.duration && <span>{video.duration}</span>}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingVideo(video)}
                        className="w-full sm:w-auto"
                      >
                        <Edit size={16} className="mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteVideoMutation.mutate(video.id)}
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

            {videos.length === 0 && !videosLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No videos yet. Add your first video!</p>
              </div>
            )}
          </TabsContent>

          {/* Concepts Tab */}
          <TabsContent value="concepts">
            {/* Add Concept Button */}
            <div className="mb-6">
              <Button 
                onClick={() => setEditingConcept({ title: '', description: '', image: '', features: [], order: 0 })}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
              >
                <Plus className="mr-2" size={20} />
                Add Concept
              </Button>
            </div>

            {/* Concept Form */}
            {editingConcept && (
              <Card className="mb-6 sm:mb-8">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">{editingConcept.id ? 'Edit Concept' : 'New Concept'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleConceptSubmit} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="concept-title">Title *</Label>
                        <Input
                          id="concept-title"
                          value={editingConcept.title}
                          onChange={(e) => setEditingConcept({ ...editingConcept, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="concept-order">Order</Label>
                        <Input
                          id="concept-order"
                          type="number"
                          value={editingConcept.order}
                          onChange={(e) => setEditingConcept({ ...editingConcept, order: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="concept-description">Description *</Label>
                      <Textarea
                        id="concept-description"
                        value={editingConcept.description}
                        onChange={(e) => setEditingConcept({ ...editingConcept, description: e.target.value })}
                        required
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="concept-image">Concept Image *</Label>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Input
                          id="concept-image"
                          value={editingConcept.image}
                          onChange={(e) => setEditingConcept({ ...editingConcept, image: e.target.value })}
                          placeholder="Image URL"
                          required
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          disabled={uploading} 
                          onClick={() => document.getElementById('concept-upload').click()}
                          className="w-full sm:w-auto"
                        >
                          <Upload className="mr-2" size={16} />
                          {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                        <input
                          id="concept-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'concept', 'image')}
                        />
                      </div>
                      {editingConcept.image && (
                        <img 
                          src={editingConcept.image} 
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
                      {editingConcept.features?.map((feature, index) => (
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
                        {editingConcept.id ? 'Update' : 'Create'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingConcept(null)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Concepts List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {concepts.map((concept) => (
                <Card key={concept.id}>
                  {concept.image && (
                    <div className="relative h-40 sm:h-48">
                      <img src={concept.image} alt={concept.title} className="w-full h-full object-cover rounded-t-lg" />
                    </div>
                  )}
                  <CardContent className="pt-4">
                    <h3 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2">{concept.title}</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-3">{concept.description}</p>
                    {concept.features && concept.features.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Features:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {concept.features.slice(0, 3).map((feature, idx) => (
                            <li key={idx} className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full mr-2"></span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingConcept(concept)}
                        className="w-full sm:w-auto"
                      >
                        <Edit size={16} className="mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteConceptMutation.mutate(concept.id)}
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

            {concepts.length === 0 && !conceptsLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No concepts yet. Add your first concept!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

