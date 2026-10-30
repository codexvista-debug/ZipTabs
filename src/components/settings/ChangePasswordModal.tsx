"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const { user, changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 3) {
      setError("Password must be at least 3 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (res.success) {
        setSuccess(true);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1800);
      } else {
        setError(res.error || "Failed to update password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-transparent"
      />

      <div className="relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Creative Top: Sculpted Dynamic Island Notch */}
        <div className="flex justify-center -mt-px">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SECURITY ACCESS</span>
          </div>
        </div>

        {/* Creative Sides: Gradient Shadow Rails on Left & Right Borders */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

        <div className="p-6 sm:p-7 pt-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                Change Password
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Update master credentials for user <strong className="text-zinc-900">@{user?.username}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                Password successfully updated in Supabase!
              </span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-50/80 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min. 3 chars)"
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-50/80 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="text-zinc-400 hover:text-zinc-600 absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50/80 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
