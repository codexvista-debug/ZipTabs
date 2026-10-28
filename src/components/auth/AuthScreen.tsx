"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Lock,
  Clock,
  AlertTriangle,
} from "lucide-react";

export function AuthScreen() {
  const { login, lockoutInfo, refreshLockoutStatus } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live countdown timer for 24-hour lockout
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!lockoutInfo?.locked || !lockoutInfo?.lockedUntil) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = new Date(lockoutInfo.lockedUntil!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        refreshLockoutStatus();
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutInfo, refreshLockoutStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutInfo?.locked) return;

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

  const isLocked = Boolean(lockoutInfo?.locked);
  const failedAttempts = lockoutInfo?.attempts || 0;

  return (
    <div className="min-h-screen w-full bg-[#000000] flex items-center justify-center p-4 select-none text-white font-sans">
      <div className="w-full max-w-[420px]">
        {/* Main Portal Card */}
        <div className="bg-[#17171a] border border-[#26262b] rounded-2xl p-8 sm:p-9 shadow-2xl">
          {isLocked ? (
            /* Security Lockout / Lockdown View */
            <div className="text-center py-1 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-5 shadow-lg shadow-rose-500/20 animate-pulse">
                <ShieldAlert className="w-9 h-9" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold uppercase tracking-wider mb-3">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {lockoutInfo?.isLockdown
                    ? "Perimeter Lockdown Active"
                    : lockoutInfo?.isBlacklisted
                    ? "IP Blacklisted"
                    : "Security Lockout"}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {lockoutInfo?.isLockdown
                  ? "Access Restricted"
                  : lockoutInfo?.isBlacklisted
                  ? "IP Address Blacklisted"
                  : "IP Address Locked Out"}
              </h2>

              <p className="text-xs text-zinc-300 mt-2 leading-relaxed max-w-xs mx-auto">
                {lockoutInfo?.isLockdown
                  ? "Website Lockdown is active. Access to this workspace is restricted strictly to authorized network IP addresses."
                  : lockoutInfo?.isBlacklisted
                  ? "Your IP address has been permanently blacklisted by the Administrator. Access denied."
                  : "Access to ZipTabs has been locked from your IP address after 3 consecutive failed password attempts."}
              </p>

              {/* Live Countdown Box (Only for temporary 3-strike lockout) */}
              {!lockoutInfo?.isLockdown && !lockoutInfo?.isBlacklisted && (
                <div className="my-6 p-4 rounded-xl bg-[#201518] border border-rose-900/50 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-rose-300 font-medium mb-1.5">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>Lockout Expires In</span>
                  </div>
                  <div className="text-2xl font-black text-white tracking-wider font-mono">
                    {timeLeft
                      ? `${String(timeLeft.hours).padStart(2, "0")}h : ${String(timeLeft.minutes).padStart(2, "0")}m : ${String(timeLeft.seconds).padStart(2, "0")}s`
                      : "24h 00m 00s"}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">
                    Automatic unblock after 24-hour security window
                  </div>
                </div>
              )}

              {/* Lockout Details Info (Zero username or IP disclosure) */}
              <div className="bg-[#1f1f24] rounded-xl p-3 border border-[#2d2d35] text-left text-xs space-y-2 my-6">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Enforcement:</span>
                  <span className="text-rose-400 font-semibold text-[11px]">
                    {lockoutInfo?.isLockdown
                      ? "Perimeter Whitelist Firewall"
                      : lockoutInfo?.isBlacklisted
                      ? "Permanent Administrator Ban"
                      : "Server-Level Lockout (3 Strikes)"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Status:</span>
                  <span className="text-zinc-300 font-semibold text-[11px]">
                    Connection Rejected
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 text-center">
                All authentication requests from this network are rejected.
              </div>
            </div>
          ) : (
            /* Standard Login Form with Live Attempt Counter */
            <>
              {/* Card Title */}
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  ZipTabs Portal
                </h1>
                <p className="text-xs text-zinc-400 mt-1.5 font-normal">
                  Enter your credentials to access the management suite
                </p>
              </div>

              {/* Attempts Counter & Warning Banner */}
              {failedAttempts > 0 && (
                <div
                  className={`mb-5 p-3.5 rounded-xl border text-xs animate-in fade-in duration-200 ${
                    failedAttempts >= 2
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                      : "bg-amber-500/10 border-amber-500/25 text-amber-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`flex items-center gap-2 font-bold ${
                        failedAttempts >= 2 ? "text-rose-300" : "text-amber-300"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Failed Attempts: {failedAttempts} of 3
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        failedAttempts >= 2
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {3 - failedAttempts} Remaining
                    </span>
                  </div>

                  {/* 3-Strike Visual Indicator */}
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {[1, 2, 3].map((strike) => (
                      <div
                        key={strike}
                        className={`h-1.5 rounded-full transition-all ${
                          strike <= failedAttempts
                            ? "bg-rose-500 shadow-xs shadow-rose-500/50"
                            : "bg-zinc-700"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-[11px] leading-relaxed opacity-90">
                    {failedAttempts === 1
                      ? "1 wrong password entered. 2 attempts remaining before this IP is locked out for 24 hours."
                      : "FINAL ATTEMPT: 1 more wrong password will lock your IP from this website for 24 hours."}
                  </p>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
            </>
          )}

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
