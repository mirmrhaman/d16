import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserPlus, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const roles = [
  { value: "viewer", label: "Viewer (no admin access)" },
  { value: "super", label: "Super User (content edit)" },
  { value: "admin", label: "Admin (full access)" },
];

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(["users"]),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.User.create(payload),
    onSuccess: () => queryClient.invalidateQueries(["users"]),
  });

  const [newEmail, setNewEmail] = useState("");
  const [newPasswords, setNewPasswords] = useState({});
  const [newPhones, setNewPhones] = useState({});

  const toggleVerified = (user) => {
    updateMutation.mutate({
      id: user.id,
      data: { ...user, verified: !user.verified },
    });
  };

  const changeRole = (user, role) => {
    updateMutation.mutate({
      id: user.id,
      data: { ...user, role },
    });
  };

  const addUser = () => {
    const email = newEmail.trim();
    if (!email) return;
    createMutation.mutate({
      email,
      name: email.split("@")[0],
      role: "viewer",
      verified: false,
      password: "changeme123",
      two_factor_enabled: false,
      two_factor_code: "123456",
      phone: "",
    });
    setNewEmail("");
  };

  const updatePassword = (user) => {
    const nextPassword = newPasswords[user.id];
    if (!nextPassword) return;
    updateMutation.mutate({
      id: user.id,
      data: { ...user, password: nextPassword },
    });
    setNewPasswords((prev) => ({ ...prev, [user.id]: "" }));
  };

  const updatePhone = (user) => {
    const nextPhone = newPhones[user.id];
    if (nextPhone === undefined) return;
    updateMutation.mutate({
      id: user.id,
      data: { ...user, phone: nextPhone },
    });
  };

  const toggle2FA = (user) => {
    updateMutation.mutate({
      id: user.id,
      data: { ...user, two_factor_enabled: !user.two_factor_enabled },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
          <Link to={createPageUrl("AdminDashboard")}>
            <Button variant="outline" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">User Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Verify emails and assign roles (Admin / Super User)
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-[var(--accent-light)]">
              <UserPlus className="text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle>Invite User</CardTitle>
              <p className="text-sm text-gray-600">Add a new user email, then verify and set a role</p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="newuser@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addUser} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]" disabled={createMutation.isLoading}>
              Add User
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="font-semibold text-[var(--primary)]">{user.email}</p>
                  <p className="text-sm text-gray-600">Role: {user.role}</p>
                  <p className="text-xs text-gray-500">Verified: {user.verified ? "Yes" : "No"}</p>
                  <p className="text-xs text-gray-500">Phone: {user.phone || "Not set"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Role</Label>
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value)}
                      className="border rounded-md px-3 py-2 text-sm"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Verification</Label>
                    <Button
                      variant={user.verified ? "outline" : "default"}
                      className={user.verified ? "" : "bg-[var(--primary)] hover:bg-[var(--primary-dark)]"}
                      onClick={() => toggleVerified(user)}
                    >
                      {user.verified ? "Revoke" : "Verify"}
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Set Password</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="password"
                        placeholder="New password"
                        value={newPasswords[user.id] || ""}
                        onChange={(e) => setNewPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))}
                        className="sm:w-40"
                      />
                      <Button
                        variant="outline"
                        onClick={() => updatePassword(user)}
                        disabled={updateMutation.isLoading || !(newPasswords[user.id] || "").trim()}
                      >
                        <Save className="mr-1" size={16} />
                        Save
                      </Button>
                    </div>
                    <p className="text-[11px] text-gray-500">Initial password for new users: changeme123</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Phone for OTP</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="tel"
                        placeholder="+8801XXXXXXXXX"
                        value={newPhones[user.id] ?? user.phone ?? ""}
                        onChange={(e) => setNewPhones((prev) => ({ ...prev, [user.id]: e.target.value }))}
                        className="sm:w-48"
                      />
                      <Button
                        variant="outline"
                        onClick={() => updatePhone(user)}
                        disabled={updateMutation.isLoading}
                      >
                        <Save className="mr-1" size={16} />
                        Save
                      </Button>
                    </div>
                    <Button
                      variant={user.two_factor_enabled ? "default" : "outline"}
                      className={user.two_factor_enabled ? "bg-[var(--primary)] hover:bg-[var(--primary-dark)]" : ""}
                      onClick={() => toggle2FA(user)}
                      disabled={updateMutation.isLoading}
                    >
                      {user.two_factor_enabled ? "Disable 2FA" : "Enable 2FA"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
