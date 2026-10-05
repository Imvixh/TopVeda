"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Users,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  Mail,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Layers,
  Phone,
  Calendar,
  Send,
  UserCheck,
  UserX,
  Filter,
} from "lucide-react";

interface BatchInfo {
  batchId: string;
  batchTitle: string;
  boardLabel?: string | null;
  assignedAt?: string;
  enrolledAt?: string;
  subjects?: string[];
  isActive?: boolean;
}

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  avatarUrl?: string | null;
  qualification?: string | null;
  bio?: string | null;
  status: "ACTIVE" | "BLOCKED" | string;
  createdAt: string;
  updatedAt: string;
  teacherBatches: BatchInfo[];
  studentBatches: BatchInfo[];
}

export default function UserManagementPage() {
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [batchFilter, setBatchFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Inspect Modal State
  const [inspectUser, setInspectUser] = React.useState<UserProfile | null>(null);

  // Email / Notification Composer State
  const [messageTarget, setMessageTarget] = React.useState<UserProfile | null>(null);
  const [emailSubject, setEmailSubject] = React.useState("");
  const [emailBody, setEmailBody] = React.useState("");
  const [sendInApp, setSendInApp] = React.useState(true);
  const [sendEmail, setSendEmail] = React.useState(true);
  const [isSendingMessage, setIsSendingMessage] = React.useState(false);

  // Block / Unblock Modal State
  const [statusTarget, setStatusTarget] = React.useState<UserProfile | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = React.useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Load Users Function
  const loadUsers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to load user directory." });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to load users." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // Distinct Batch Options for Filtering
  const availableBatches = React.useMemo(() => {
    const batchMap = new Map<string, string>();
    users.forEach((u) => {
      [...u.teacherBatches, ...u.studentBatches].forEach((b) => {
        if (b.batchId && b.batchTitle) {
          batchMap.set(b.batchId, b.batchTitle);
        }
      });
    });
    return Array.from(batchMap.entries()).map(([id, title]) => ({ id, title }));
  }, [users]);

  // Statistics Summary
  const stats = React.useMemo(() => {
    const total = users.length;
    const students = users.filter((u) => u.role === "STUDENT").length;
    const teachers = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN").length;
    const blocked = users.filter((u) => u.status === "BLOCKED").length;
    return { total, students, teachers, blocked };
  }, [users]);

  // Filtered Users
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      // 1. Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === "" ||
        u.fullName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.phone.toLowerCase().includes(query);

      // 2. Role Filter
      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "STUDENT" && u.role === "STUDENT") ||
        (roleFilter === "TEACHER" && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) ||
        (roleFilter === "SUPER_ADMIN" && u.role === "SUPER_ADMIN");

      // 3. Status Filter
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.status !== "BLOCKED") ||
        (statusFilter === "BLOCKED" && u.status === "BLOCKED");

      // 4. Batch Filter
      const userBatchIds = [
        ...u.teacherBatches.map((b) => b.batchId),
        ...u.studentBatches.map((b) => b.batchId),
      ];
      const matchesBatch = batchFilter === "ALL" || userBatchIds.includes(batchFilter);

      return matchesSearch && matchesRole && matchesStatus && matchesBatch;
    });
  }, [users, searchQuery, roleFilter, statusFilter, batchFilter]);

  // Handle Send Direct Communication
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageTarget || !emailSubject.trim() || !emailBody.trim()) {
      setFeedback({ type: "error", message: "Subject and message body cannot be empty." });
      return;
    }

    try {
      setIsSendingMessage(true);
      const res = await fetch("/api/admin/users/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: messageTarget.id,
          recipientEmail: messageTarget.email,
          recipientName: messageTarget.fullName,
          subject: emailSubject,
          message: emailBody,
          sendInApp,
          sendEmail,
          category: "SYSTEM",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: `Official notification dispatched to ${messageTarget.fullName} from no-reply@topveda.in.`,
        });
        setMessageTarget(null);
        setEmailSubject("");
        setEmailBody("");
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to dispatch message." });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to send message." });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle Toggle Status (Block / Unblock)
  const handleConfirmStatusToggle = async () => {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    try {
      setIsUpdatingStatus(true);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: statusTarget.id,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: `User ${statusTarget.fullName} has been ${nextStatus === "BLOCKED" ? "blocked" : "reactivated"}.`,
        });
        setStatusTarget(null);
        void loadUsers();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to update status." });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to update status." });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Delete User Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/users?userId=${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: `User ${deleteTarget.fullName} has been permanently deleted.`,
        });
        setDeleteTarget(null);
        void loadUsers();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to delete user." });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to delete user." });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold text-[10px] uppercase tracking-wider">
              SUPER ADMIN GOVERNANCE
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              profiles & enrollments
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <Users className="h-7 w-7 text-brand-orange" />
            <span>User Management & Batch Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Monitor registered students and faculty, inspect assigned/enrolled batches, manage access, and dispatch official communications.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadUsers()}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh Directory
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Interactive KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card
          onClick={() => {
            setRoleFilter("ALL");
            setStatusFilter("ALL");
          }}
          className="p-4 cursor-pointer hover:border-brand-orange/60 hover:shadow-xs transition-all space-y-2 border-brand-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-text-muted uppercase">Total Directory</span>
            <div className="h-8 w-8 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-brand-text-primary">{stats.total}</p>
          <p className="text-[11px] text-brand-text-muted">Registered accounts</p>
        </Card>

        {/* Students */}
        <Card
          onClick={() => {
            setRoleFilter("STUDENT");
            setStatusFilter("ALL");
          }}
          className="p-4 cursor-pointer hover:border-emerald-500/60 hover:shadow-xs transition-all space-y-2 border-brand-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Enrolled Students</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-brand-text-primary">{stats.students}</p>
          <p className="text-[11px] text-emerald-600 font-semibold">Active learners</p>
        </Card>

        {/* Teachers / Faculty */}
        <Card
          onClick={() => {
            setRoleFilter("TEACHER");
            setStatusFilter("ALL");
          }}
          className="p-4 cursor-pointer hover:border-blue-500/60 hover:shadow-xs transition-all space-y-2 border-brand-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase">Faculty / Admins</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-brand-text-primary">{stats.teachers}</p>
          <p className="text-[11px] text-blue-600 font-semibold">Assigned educators</p>
        </Card>

        {/* Blocked Accounts */}
        <Card
          onClick={() => {
            setStatusFilter("BLOCKED");
            setRoleFilter("ALL");
          }}
          className="p-4 cursor-pointer hover:border-rose-500/60 hover:shadow-xs transition-all space-y-2 border-brand-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">Blocked / Suspended</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-brand-text-primary">{stats.blocked}</p>
          <p className="text-[11px] text-rose-600 font-semibold">Access restricted</p>
        </Card>
      </div>

      {/* 3. Search & Multi-Filter Toolbar */}
      <Card className="p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search by user name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              aria-label="Filter users by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Roles (Students & Teachers)</option>
              <option value="STUDENT">Students Only</option>
              <option value="TEACHER">Teachers & Faculty (Admins)</option>
              <option value="SUPER_ADMIN">Super Admins Only</option>
            </select>
          </div>

          {/* Batch Filter */}
          <div>
            <select
              aria-label="Filter users by academic batch"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Batches</option>
              {availableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              aria-label="Filter users by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="BLOCKED">Blocked Only</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(roleFilter !== "ALL" || statusFilter !== "ALL" || batchFilter !== "ALL" || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-border/40 text-xs">
            <span className="text-brand-text-muted font-bold flex items-center gap-1">
              <Filter className="h-3 w-3" /> Active Filters:
            </span>
            {roleFilter !== "ALL" && (
              <Badge variant="peach" size="sm" className="font-semibold">
                Role: {roleFilter}
              </Badge>
            )}
            {statusFilter !== "ALL" && (
              <Badge variant="outline" size="sm" className="font-semibold">
                Status: {statusFilter}
              </Badge>
            )}
            {batchFilter !== "ALL" && (
              <Badge variant="peach" size="sm" className="font-semibold">
                Batch: {availableBatches.find((b) => b.id === batchFilter)?.title || batchFilter}
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="outline" size="sm" className="font-semibold">
                Query: &quot;{searchQuery}&quot;
              </Badge>
            )}
            <button
              onClick={() => {
                setRoleFilter("ALL");
                setStatusFilter("ALL");
                setBatchFilter("ALL");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-brand-orange hover:underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* 4. Directory Table */}
      <Card className="overflow-hidden border-brand-border shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-text-muted">
            <thead className="bg-brand-bg-warm/80 text-[11px] font-black uppercase text-brand-text-primary border-b border-brand-border">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Academic Batches & Subjects</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-brand-orange" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-text-muted">
                    <div className="space-y-2">
                      <Users className="h-8 w-8 text-brand-text-muted/50 mx-auto" />
                      <p className="font-bold text-brand-text-primary">No users found</p>
                      <p className="text-xs text-brand-text-muted">
                        No accounts match your search or filter criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isTeacherOrAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
                  const assignedBatches = isTeacherOrAdmin ? u.teacherBatches : u.studentBatches;
                  const isBlocked = u.status === "BLOCKED";

                  return (
                    <tr key={u.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 px-4 font-semibold text-brand-text-primary">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.fullName}
                              className="h-9 w-9 rounded-full object-cover border border-brand-border shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-orange-100 text-brand-orange flex items-center justify-center font-bold text-xs shrink-0">
                              {u.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="space-y-0.5 max-w-[200px] sm:max-w-xs truncate">
                            <p className="font-bold text-brand-text-primary truncate">{u.fullName}</p>
                            <p className="text-[11px] text-brand-text-muted truncate">{u.email}</p>
                            {u.phone && (
                              <p className="text-[10px] text-brand-text-muted/80 flex items-center gap-1 font-mono">
                                <Phone className="h-2.5 w-2.5 text-brand-orange" />
                                {u.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {u.role === "SUPER_ADMIN" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                            <ShieldCheck className="h-3 w-3" /> Super Admin
                          </span>
                        ) : u.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                            <Briefcase className="h-3 w-3" /> Faculty / Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                            <GraduationCap className="h-3 w-3" /> Student
                          </span>
                        )}
                      </td>

                      {/* Batches & Subjects */}
                      <td className="py-3.5 px-4 max-w-sm">
                        {assignedBatches.length === 0 ? (
                          <span className="text-[11px] text-brand-text-muted/60 italic">
                            {isTeacherOrAdmin ? "No batch assignments yet" : "No active enrollments"}
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {assignedBatches.slice(0, 3).map((b, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-brand-charcoal border border-orange-200 truncate max-w-[180px]"
                                title={b.batchTitle}
                              >
                                <Layers className="h-2.5 w-2.5 text-brand-orange shrink-0" />
                                <span className="truncate">{b.batchTitle}</span>
                                {b.subjects && b.subjects.length > 0 && (
                                  <span className="text-brand-orange font-black">
                                    ({b.subjects.join(", ")})
                                  </span>
                                )}
                              </span>
                            ))}
                            {assignedBatches.length > 3 && (
                              <button
                                onClick={() => setInspectUser(u)}
                                className="text-[10px] font-extrabold text-brand-orange hover:underline"
                              >
                                +{assignedBatches.length - 3} more
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <UserX className="h-3 w-3" /> Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <UserCheck className="h-3 w-3" /> Active
                          </span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-[11px] font-medium text-brand-text-muted whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-brand-text-muted/60" />
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Inspect / View Details */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setInspectUser(u)}
                            className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                            title="Inspect User Profile & Batches"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Dispatch Direct Message / Email */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setMessageTarget(u);
                              setEmailSubject("");
                              setEmailBody("");
                            }}
                            className="h-7 w-7 text-brand-text-muted hover:text-blue-600"
                            title="Send Direct Notification & Email"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>

                          {/* Block / Unblock Toggle */}
                          {u.role !== "SUPER_ADMIN" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setStatusTarget(u)}
                              className={`h-7 w-7 ${
                                isBlocked
                                  ? "text-red-600 hover:text-emerald-600 hover:bg-emerald-50"
                                  : "text-brand-text-muted hover:text-red-600 hover:bg-red-50"
                              }`}
                              title={isBlocked ? "Reactivate User" : "Block User Access"}
                            >
                              {isBlocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                            </Button>
                          )}

                          {/* Permanent Delete */}
                          {u.role !== "SUPER_ADMIN" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(u)}
                              className="h-7 w-7 text-brand-text-muted hover:text-red-600 hover:bg-red-50"
                              title="Delete User Permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 5. USER INSPECTION MODAL                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!inspectUser}
        onClose={() => setInspectUser(null)}
        title="User Profile & Academic Hierarchy"
        description="Comprehensive view of student/teacher account details, contact info, and assigned curriculum batches."
        maxWidth="lg"
      >
        {inspectUser && (
          <div className="space-y-5 pt-2">
            {/* Header info */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-bg-warm/80 border border-brand-border">
              {inspectUser.avatarUrl ? (
                <img
                  src={inspectUser.avatarUrl}
                  alt={inspectUser.fullName}
                  className="h-14 w-14 rounded-2xl object-cover border border-brand-border shadow-xs"
                />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-brand-orange text-white flex items-center justify-center font-bold text-xl shadow-xs">
                  {inspectUser.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-brand-text-primary">{inspectUser.fullName}</h3>
                  <Badge variant="peach" size="sm" className="text-[10px] uppercase font-bold">
                    {inspectUser.role}
                  </Badge>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      inspectUser.status === "BLOCKED"
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {inspectUser.status}
                  </span>
                </div>
                <p className="text-xs text-brand-text-muted flex items-center gap-2">
                  <span>{inspectUser.email}</span>
                  {inspectUser.phone && <span>• Phone: {inspectUser.phone}</span>}
                </p>
              </div>
            </div>

            {/* Academic Batches Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal flex items-center justify-between">
                <span>
                  {inspectUser.role === "STUDENT" ? "Enrolled Academic Batches" : "Assigned Teaching Batches & Subjects"}
                </span>
                <span className="text-brand-orange text-[11px] font-bold">
                  {(inspectUser.role === "STUDENT" ? inspectUser.studentBatches : inspectUser.teacherBatches).length} Batches
                </span>
              </h4>

              {((inspectUser.role === "STUDENT" ? inspectUser.studentBatches : inspectUser.teacherBatches).length === 0) ? (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center text-xs text-brand-text-muted">
                  No academic batch records found for this user.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {(inspectUser.role === "STUDENT" ? inspectUser.studentBatches : inspectUser.teacherBatches).map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-brand-border/80 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-brand-charcoal line-clamp-1">{b.batchTitle}</span>
                        {b.boardLabel && (
                          <Badge variant="outline" size="sm" className="text-[10px] font-semibold">
                            {b.boardLabel}
                          </Badge>
                        )}
                      </div>
                      {b.subjects && b.subjects.length > 0 && (
                        <div className="text-[11px] text-brand-orange font-semibold">
                          Subjects: {b.subjects.join(", ")}
                        </div>
                      )}
                      <div className="text-[10px] text-brand-text-muted flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {b.enrolledAt
                            ? `Enrolled: ${new Date(b.enrolledAt).toLocaleDateString("en-IN")}`
                            : b.assignedAt
                            ? `Assigned: ${new Date(b.assignedAt).toLocaleDateString("en-IN")}`
                            : "Active"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions in Modal */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const target = inspectUser;
                  setInspectUser(null);
                  setMessageTarget(target);
                }}
                className="text-xs font-bold"
              >
                <Mail className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                Dispatch Email / Notification
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setInspectUser(null)}
                className="text-xs font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 6. DISPATCH DIRECT EMAIL & IN-APP NOTIFICATION MODAL                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!messageTarget}
        onClose={() => !isSendingMessage && setMessageTarget(null)}
        title="Dispatch Official Communication"
        description="Send a verified direct notification and official email to the user from no-reply@topveda.in."
        maxWidth="md"
      >
        {messageTarget && (
          <form onSubmit={handleSendMessage} className="space-y-4 pt-2">
            {/* Sender / Recipient Banner */}
            <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-brand-text-muted font-medium">From:</span>
                <span className="font-bold text-brand-charcoal font-mono">TopVeda Admin &lt;no-reply@topveda.in&gt;</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-text-muted font-medium">Recipient:</span>
                <span className="font-bold text-brand-charcoal">
                  {messageTarget.fullName} ({messageTarget.email})
                </span>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-charcoal">
                Subject <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Important Batch Schedule Update / Account Notice"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
                className="rounded-xl text-xs"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-charcoal">
                Message Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                placeholder="Write your official message to the student or educator..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={5}
                required
                className="w-full px-3 py-2 rounded-xl text-xs border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-orange resize-none"
              />
            </div>

            {/* Delivery Channels */}
            <div className="p-3 rounded-xl bg-gray-50 border border-brand-border space-y-2 text-xs">
              <span className="font-bold text-brand-charcoal block">Delivery Channels</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-brand-text-primary">
                  <input
                    type="checkbox"
                    checked={sendInApp}
                    onChange={(e) => setSendInApp(e.target.checked)}
                    className="rounded border-brand-border text-brand-orange focus:ring-brand-orange"
                  />
                  <span>In-App Notification</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-brand-text-primary">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded border-brand-border text-brand-orange focus:ring-brand-orange"
                  />
                  <span>Email (via no-reply@topveda.in)</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMessageTarget(null)}
                disabled={isSendingMessage}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSendingMessage}
                className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold gap-1.5 shadow-2xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSendingMessage ? "Dispatching..." : "Send Communication"}</span>
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 7. BLOCK / UNBLOCK CONFIRMATION MODAL                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!statusTarget}
        onClose={() => !isUpdatingStatus && setStatusTarget(null)}
        title={statusTarget?.status === "BLOCKED" ? "Reactivate User Account?" : "Block User Account?"}
        description={
          statusTarget?.status === "BLOCKED"
            ? "Reactivating will restore login access and all enrolled student/teacher services."
            : "Blocking will immediately restrict user login and portal operations."
        }
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {statusTarget && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                statusTarget.status === "BLOCKED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              <p className="font-bold">{statusTarget.fullName}</p>
              <p className="font-mono text-[11px] opacity-80">{statusTarget.email}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusTarget(null)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmStatusToggle}
              disabled={isUpdatingStatus}
              className={`font-semibold text-white ${
                statusTarget?.status === "BLOCKED"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isUpdatingStatus
                ? "Updating..."
                : statusTarget?.status === "BLOCKED"
                ? "Confirm Reactivate"
                : "Confirm Block"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 8. PERMANENT DELETE CONFIRMATION MODAL                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Permanently Delete User?"
        description="Are you sure you want to permanently delete this user account? All profile records and authorization tokens will be removed. This cannot be undone."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {deleteTarget && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs space-y-1">
              <p className="font-bold text-red-900">{deleteTarget.fullName}</p>
              <p className="text-red-700 font-mono text-[11px]">{deleteTarget.email}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
