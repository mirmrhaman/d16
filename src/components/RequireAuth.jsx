import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/context/AuthContext";

export default function RequireAuth({ allowedRoles = [], featureKey, children }) {
  const { user } = useAuth();
  const location = useLocation();
  const { data: accessControl = [], isLoading } = useQuery({
    queryKey: ['accessControl'],
    queryFn: () => base44.entities.AccessControl.list()
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Checking permissions...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (featureKey && user.role === 'super') {
    const allowed = accessControl[0]?.allowed_sections || [];
    if (!allowed.includes(featureKey)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
