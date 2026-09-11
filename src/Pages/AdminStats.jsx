
import React, { useState } from "react";
import { statsClient } from "@/api/statsClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft, Award, Users, TrendingUp, Star, Target, Briefcase, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SiteIcon from '@/components/SiteIcon';
import { useAuth } from '@/context/AuthContext';

const iconMap = {
  Award, Users, TrendingUp, Star, Target, Briefcase
};

export default function AdminStats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingStat, setEditingStat] = useState(null);

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsClient.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => statsClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setEditingStat(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => statsClient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setEditingStat(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => statsClient.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stats'] })
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStat.id) {
      updateMutation.mutate({ id: editingStat.id, data: editingStat });
    } else {
      createMutation.mutate(editingStat);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to={createPageUrl("AdminDashboard")}>
              <Button variant="outline" size="icon" className="shrink-0">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Statistics</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage company statistics on homepage</p>
            </div>
          </div>
          <Button 
            onClick={() => setEditingStat({ label: '', value: '', icon: 'Award', order: 0 })}
            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto"
          >
            <Plus className="mr-2" size={20} />
            Add Stat
          </Button>
        </div>

        {editingStat && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{editingStat.id ? 'Edit Statistic' : 'New Statistic'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="value">Value *</Label>
                    <Input
                      id="value"
                      value={editingStat.value}
                      onChange={(e) => setEditingStat({ ...editingStat, value: e.target.value })}
                      placeholder="e.g., 50+, 95%"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">Label *</Label>
                    <Input
                      id="label"
                      value={editingStat.label}
                      onChange={(e) => setEditingStat({ ...editingStat, label: e.target.value })}
                      placeholder="e.g., Years of Experience"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={editingStat.order}
                      onChange={(e) => setEditingStat({ ...editingStat, order: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon">Icon *</Label>
                  <p className="text-sm text-gray-600">This chooses the built-in icon. Uploaded replacements take priority.{user?.role === 'admin' && <> <Link className="underline" to="/AdminIcons">Upload or manage icons in Website Icons.</Link></>}</p>
                  <Select value={editingStat.icon} onValueChange={(value) => setEditingStat({ ...editingStat, icon: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(iconMap).map((iconName) => {
                        const Icon = iconMap[iconName];
                        return (
                          <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                              <Icon size={16} />
                              {iconName}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] w-full sm:w-auto">
                    {editingStat.id ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingStat(null)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {stats.map((stat) => {
            return (
              <Card key={stat.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 sm:p-3 bg-[var(--accent)] rounded-lg">
                      <SiteIcon iconKey={`stats.${stat.id}`} fallback={stat.icon || 'Award'} className="text-white" size={20} />
                    </div>
                    <div className="text-3xl sm:text-4xl font-bold text-[var(--primary)]">{stat.value}</div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-2">{stat.label}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingStat(stat)}
                      className="w-full sm:w-auto"
                    >
                      <Edit size={16} className="mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(stat.id)}
                      className="w-full sm:w-auto text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {stats.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No statistics yet. Add your first stat to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
