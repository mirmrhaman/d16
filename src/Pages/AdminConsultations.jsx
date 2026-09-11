
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // Ensure Label is imported
import { ArrowLeft, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function AdminConsultations() {
  const queryClient = useQueryClient();

  const { data: consultations = [], isLoading, error } = useQuery({
    queryKey: ['consultations'],
    queryFn: () => base44.entities.Consultation.list('-created_date')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Consultation.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['consultations'])
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    contacted: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800"
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
          <Link to={createPageUrl("AdminDashboard")}>
            <Button variant="outline" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Consultation Requests</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage client inquiries</p>
          </div>
        </div>

        {error && <p role="alert" className="p-4 bg-red-50 text-red-800">{error.message}</p>}
        {updateMutation.error && <p role="alert" className="p-4 bg-red-50 text-red-800">{updateMutation.error.message}</p>}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading consultations...</p>
          </div>
        ) : consultations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No consultation requests yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <Card key={consultation.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-[var(--primary)] mb-2">{consultation.full_name}</h3>
                          <Badge className={statusColors[consultation.status]}>
                            {consultation.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(consultation.created_date || consultation.created_at), 'MMM d, yyyy HH:mm:ss')}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={16} className="text-[var(--accent)]" />
                          <a href={`mailto:${consultation.email}`} className="hover:text-[var(--primary)]">
                            {consultation.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={16} className="text-[var(--accent)]" />
                          <a href={`tel:${consultation.phone}`} className="hover:text-[var(--primary)]">
                            {consultation.phone}
                          </a>
                        </div>
                        {consultation.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin size={16} className="text-[var(--accent)]" />
                            {consultation.location}
                          </div>
                        )}
                        {consultation.preferred_date && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={16} className="text-[var(--accent)]" />
                            {format(new Date(consultation.preferred_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Project Type:</span>
                          <p className="text-sm text-gray-600">{consultation.project_type}</p>
                        </div>
                        {consultation.budget && (
                          <div>
                            <span className="text-sm font-semibold text-gray-700">Budget:</span>
                            <p className="text-sm text-gray-600">{consultation.budget}</p>
                          </div>
                        )}
                      </div>

                      {consultation.message && (
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Message:</span>
                          <p className="text-sm text-gray-600 mt-1">{consultation.message}</p>
                        </div>
                      )}
                    </div>

                    <div className="lg:w-48">
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Update Status</Label>
                      <Select 
                        value={consultation.status} 
                        onValueChange={(value) => updateMutation.mutate({ id: consultation.id, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
