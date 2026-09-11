
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { blogPostsClient } from "@/api/blogPostsClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, ArrowLeft, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminBlog() {
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => blogPostsClient.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => blogPostsClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      setEditingPost(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => blogPostsClient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      setEditingPost(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => blogPostsClient.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blogPosts'] })
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditingPost({ ...editingPost, featured_image: file_url });
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPost.id) {
      updateMutation.mutate({ id: editingPost.id, data: editingPost });
    } else {
      createMutation.mutate(editingPost);
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
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Blog Posts</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Create and manage blog content</p>
            </div>
          </div>
          <Button 
            onClick={() => setEditingPost({ 
              title: '', 
              excerpt: '', 
              content: '', 
              featured_image: '', 
              category: '', 
              author: '',
              published_date: new Date().toISOString().split('T')[0]
            })}
            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto"
          >
            <Plus className="mr-2" size={20} />
            Add Post
          </Button>
        </div>

        {editingPost && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{editingPost.id ? 'Edit Post' : 'New Post'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={editingPost.title}
                    onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={editingPost.excerpt}
                    onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                    placeholder="Short description..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={editingPost.content}
                    onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                    required
                    rows={10}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={editingPost.category} onValueChange={(value) => setEditingPost({ ...editingPost, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interior_design">Interior Design</SelectItem>
                        <SelectItem value="kitchen_design">Kitchen Design</SelectItem>
                        <SelectItem value="office_design">Office Design</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="tips">Tips</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      value={editingPost.author}
                      onChange={(e) => setEditingPost({ ...editingPost, author: e.target.value })}
                      placeholder="Author name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="published_date">Published Date</Label>
                    <Input
                      id="published_date"
                      type="date"
                      value={editingPost.published_date}
                      onChange={(e) => setEditingPost({ ...editingPost, published_date: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Leave blank for a draft. A future date schedules publication.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featured_image">Featured Image *</Label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Input
                      id="featured_image"
                      value={editingPost.featured_image}
                      onChange={(e) => setEditingPost({ ...editingPost, featured_image: e.target.value })}
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
                  {editingPost.featured_image && (
                    <img 
                      src={editingPost.featured_image} 
                      alt="Preview" 
                      className="mt-2 h-32 sm:h-40 w-full sm:w-auto rounded-lg object-cover" 
                    />
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto">
                    {editingPost.id ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingPost(null)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {posts.map((post) => (
            <Card key={post.id}>
              {post.featured_image && (
                <div className="relative h-40 sm:h-48">
                  <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover rounded-t-lg" />
                </div>
              )}
              <CardContent className="pt-4">
                <h3 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2">{post.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{post.category?.replace(/_/g, ' ')}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPost(post)}
                    className="w-full sm:w-auto"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(post.id)}
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

        {posts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No blog posts yet. Write your first post!</p>
          </div>
        )}
      </div>
    </div>
  );
}
