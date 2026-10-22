"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export function AuthScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.error || "Invalid username or password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] flex items-center justify-center p-4 select-none text-white font-sans">
      <div className="w-full max-w-[420px]">
        {/* Main Portal Card */}
        <div className="bg-[#17171a] border border-[#26262b] rounded-2xl p-8 sm:p-9 shadow-2xl">
          {/* Card Title */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              ZipTabs Portal
            </h1>
            <p className="text-xs text-zinc-400 mt-1.5 font-normal">
              Enter your credentials to access the management suite
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-3.5 py-2.5 bg-[#222226] border border-[#303036] rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-[#222226] border border-[#303036] rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Solid White "Secure Login" button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-wide transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Secure Login</span>
            </button>
          </form>

          {/* Subdued Bottom Portal Label */}
          <div className="mt-8 pt-5 border-t border-[#26262b] text-center">
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              ZIPTABS SECURE MANAGEMENT ENVIRONMENT
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
