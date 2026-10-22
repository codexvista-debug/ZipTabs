"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export function AuthScreen() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        const res = await register(username, password);
        if (!res.success) {
          setError(res.error || "Failed to create account.");
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error || "Invalid username or password.");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillChief = () => {
    setUsername("chief");
    setPassword("123");
    setIsRegister(false);
    setError(null);
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
              {isRegister
                ? "Create a username and password to access the suite"
                : "Enter your credentials to access the management suite"}
            </p>
          </div>

          {/* Info Banner */}
          {info && (
            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>{info}</span>
            </div>
          )}

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
                placeholder="chief"
                className="w-full px-3.5 py-2.5 bg-[#222226] border border-[#303036] rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Password
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      alert("Please log in with 'chief' / '123' or contact workspace admin.");
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-[#222226] border border-[#303036] rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
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
              className="w-full mt-3 py-2.5 px-4 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-wide transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isRegister ? "Create Account" : "Secure Login"}</span>
            </button>
          </form>

          {/* Quick Chief shortcut */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={fillChief}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Default admin: <span className="text-zinc-300 font-semibold underline">chief</span> / <span className="text-zinc-300 font-semibold underline">123</span>
            </button>
          </div>

          {/* Switch between Login and Register */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setInfo(null);
              }}
              className="text-xs text-zinc-400 hover:text-white font-medium transition-colors"
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "New user? Create account"}
            </button>
          </div>

          {/* Subdued Bottom Portal Label */}
          <div className="mt-6 pt-5 border-t border-[#26262b] text-center">
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              PROFESSIONAL WORKSPACE PORTAL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
