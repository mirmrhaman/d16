import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { IS_DEMO } from '@/api/transport';
import { canEditSection, adminLanding } from '@/api/permissions';
import { useAuth } from "@/context/AuthContext";

export default function RequireAuth({ allowedRoles = [], featureKey, children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

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

  if (featureKey && !canEditSection(user, featureKey, IS_DEMO)) {
    return <Navigate to={adminLanding(user, IS_DEMO)} replace />;
  }

  return children;
}
