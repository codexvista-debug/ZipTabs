"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
  Lock,
  Shield,
  ShieldCheck,
  Check,
  Copy,
  Sparkles,
  Zap,
  Terminal,
  Activity,
  Layers,
  Key,
  Database,
  CheckCircle2,
  Clock,
  Sliders,
} from "lucide-react";
import { ZipTabsLogo } from "@/components/ui/ZipTabsLogo";

type LoadingVariation = "obsidian-portal" | "minimal-luxury" | "command-hud" | "hardware-vault";

const LOADING_STAGES = [
  { text: "Securing perimeter connection...", detail: "TLS 1.3 // AES-256 Handshake" },
  { text: "Querying Supabase Cloud Vault...", detail: "PostgreSQL Database Connection Pool" },
  { text: "Reconciling vendor accounts & invoices...", detail: "373 Records & Aging Buckets" },
  { text: "Hydrating reminders & encrypted notes...", detail: "IndexedDB Cloud Mirror Active" },
  { text: "Finalizing executive workspace...", detail: "Workspace Session Ready" },
];

export function DesignLabView() {
  const [selectedVariation, setSelectedVariation] = useState<LoadingVariation>("obsidian-portal");
  const [progress, setProgress] = useState(42);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceFrame, setDeviceFrame] = useState<"desktop" | "mobile">("desktop");
  const [copiedCode, setCopiedCode] = useState(false);

  // Auto-play simulation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return Math.min(prev + 1, 100);
      });
    }, 85);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Current stage calculation
  const stageIndex = Math.min(
    Math.floor((progress / 100) * LOADING_STAGES.length),
    LOADING_STAGES.length - 1
  );
  const currentStage = LOADING_STAGES[stageIndex];

  // Esc key exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`// Selected loading screen variation: ${selectedVariation}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // -------------------------------------------------------------
  // VARIATION 1: OBSIDIAN PORTAL (Matches Login Page Exactly)
  // Direct twin to AuthScreen.tsx: #000000 bg, #17171a card, #26262b border,
  // stark white typography, tactile solid-white progress, security badge.
  // -------------------------------------------------------------
  const renderObsidianPortal = () => (
    <div className="w-full h-full min-h-[460px] bg-[#000000] flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Subtle ambient bloom behind card */}
      <div className="absolute w-96 h-96 rounded-full bg-white/[0.03] blur-[120px] pointer-events-none" />

      {/* Main Portal Card - Matches AuthScreen exactly */}
      <div className="w-full max-w-[420px] bg-[#17171a] border border-[#26262b] rounded-2xl p-7 sm:p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon with Breathing White Halo */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-white/10 blur-md animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-[#222226] border border-[#303036] flex items-center justify-center shadow-lg shadow-black/60">
              <ZipTabsLogo size="md" showText={false} />
            </div>
          </div>
        </div>

        {/* Portal Title & Subtitle */}
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            ZipTabs Portal
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 font-normal">
            Decrypting encrypted management workspace...
          </p>
        </div>

        {/* High-Contrast Solid White Button Progress Bar (Echoes the "Secure Login" button) */}
        <div className="space-y-2 mb-6">
          <div className="relative w-full h-10 bg-[#222226] border border-[#303036] rounded-xl overflow-hidden p-1 shadow-inner flex items-center">
            {/* Luminous Fill */}
            <div
              className="h-full bg-white rounded-lg transition-all duration-150 ease-out flex items-center justify-end pr-2.5 shadow-sm"
              style={{ width: `${Math.max(progress, 6)}%` }}
            >
              {progress >= 20 && (
                <span className="text-[11px] font-mono font-black text-black tracking-wider">
                  {progress}%
                </span>
              )}
            </div>
            {progress < 20 && (
              <span className="absolute right-3 text-[11px] font-mono font-bold text-zinc-400">
                {progress}%
              </span>
            )}
          </div>
        </div>

        {/* Security Enforcement Box - Matches AuthScreen #1f1f24 Box */}
        <div className="bg-[#1f1f24] rounded-xl p-3.5 border border-[#2d2d35] text-left text-xs space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enforcement:</span>
            </span>
            <span className="text-emerald-400 font-semibold text-[11px] tracking-wide">
              Perimeter Whitelist Active
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Encryption:</span>
            </span>
            <span className="text-zinc-300 font-mono text-[11px]">
              AES-256-GCM Vault
            </span>
          </div>

          <div className="pt-2 border-t border-[#2d2d35] flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 truncate max-w-[200px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">{currentStage.text}</span>
            </span>
            <span className="text-zinc-500 font-mono text-[10px] shrink-0">
              STAGE {stageIndex + 1}/{LOADING_STAGES.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // VARIATION 2: MINIMALIST LUXURY (Apple / Vercel Stark Obsidian)
  // Hyper-clean boundless black, fine hairline glow bar, breathing glyph,
  // ultra-refined typographic tracking.
  // -------------------------------------------------------------
  const renderMinimalLuxury = () => (
    <div className="w-full h-full min-h-[460px] bg-[#000000] flex flex-col items-center justify-center p-6 text-white select-none relative overflow-hidden">
      {/* Subtle radial white bloom */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[140px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Floating Minimalist Squircle with Breathing Glow */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-3xl bg-white/[0.07] blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-[#1c1c20] to-[#0d0d0f] border border-[#2b2b30] flex items-center justify-center shadow-2xl shadow-black">
            <ZipTabsLogo size="md" showText={false} />
          </div>
        </div>

        {/* Tracked Luxury Typography */}
        <h2 className="text-lg font-bold tracking-[0.2em] uppercase text-white font-mono">
          ZipTabs
        </h2>
        <p className="text-[11px] text-zinc-500 font-mono tracking-wider mt-1.5 transition-all duration-300">
          {currentStage.text}
        </p>

        {/* Ultra-Slim Hairline Luminous Progress Bar (1.5px) */}
        <div className="w-56 mt-8 space-y-2">
          <div className="h-[2px] w-full bg-[#1e1e24] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-zinc-500 via-white to-white rounded-full transition-all duration-150 relative shadow-[0_0_12px_rgba(255,255,255,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>VAULT SECURE</span>
            </span>
            <span className="text-zinc-400 font-bold">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // VARIATION 3: CYBER MONOLITH COMMAND HUD
  // High-density executive console, dual-ring precision gyro, terminal
  // live stream ticker, high-tech security operations styling.
  // -------------------------------------------------------------
  const renderCommandHUD = () => (
    <div className="w-full h-full min-h-[460px] bg-[#070709] border border-[#1d1d24] flex flex-col items-center justify-center p-6 text-white select-none relative overflow-hidden font-mono">
      {/* High-tech faint scanlines / grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Monolith Header Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141418] border border-[#272730] text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-6 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>CHIEF SECURITY OPS</span>
          <span className="text-zinc-600">//</span>
          <span className="text-zinc-200">STAGE {stageIndex + 1}/5</span>
        </div>

        {/* Dual-Ring Precision Gyroscope */}
        <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
          {/* Subtle Outer Ring (White Segmented) */}
          <svg
            className="absolute inset-0 w-full h-full animate-spin"
            style={{ animationDuration: "7s" }}
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="46" stroke="#23232b" strokeWidth="2" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeDasharray="25 60 15 40"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Inner Counter-Rotating Ring (Emerald Dotted) */}
          <svg
            className="absolute inset-2 w-20 h-20 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "3.5s" }}
            viewBox="0 0 80 80"
          >
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="4 8"
              fill="none"
            />
          </svg>

          {/* Center Squircle Badge */}
          <div className="w-12 h-12 rounded-xl bg-[#141418] border border-[#2d2d38] flex items-center justify-center shadow-xl z-10">
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Large Monospace Percentage Counter */}
        <div className="text-3xl font-black text-white tracking-tight">
          {String(progress).padStart(2, "0")}
          <span className="text-zinc-500 text-lg font-normal ml-0.5">%</span>
        </div>

        <p className="text-xs text-zinc-400 mt-1 font-medium tracking-tight">
          {currentStage.text}
        </p>

        {/* Segmented Terminal Progress Track */}
        <div className="w-full mt-5 space-y-2">
          <div className="grid grid-cols-10 gap-1 h-1.5 w-full">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-xs transition-colors duration-200 ${
                  progress >= (i + 1) * 10
                    ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]"
                    : "bg-[#202028]"
                }`}
              />
            ))}
          </div>

          {/* Live Terminal Log Stream */}
          <div className="p-2.5 rounded-lg bg-[#111115] border border-[#22222b] text-[10px] text-left text-zinc-400 flex items-center justify-between">
            <span className="truncate max-w-[220px] text-zinc-300">
              <span className="text-emerald-400 mr-1.5">✓</span>
              {currentStage.detail}
            </span>
            <span className="text-zinc-600 shrink-0 font-mono text-[9px]">
              200 OK
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // VARIATION 4: HARDWARE VAULT / TACTILE CARD
  // Encrypted keycard with metallic gradient edge rails, 3-step checkmarks,
  // biometric badge feel with pure obsidian surface.
  // -------------------------------------------------------------
  const renderHardwareVault = () => (
    <div className="w-full h-full min-h-[460px] bg-[#000000] flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Subtle ambient gradient mesh */}
      <div className="absolute inset-0 bg-radial from-[#181820]/40 via-transparent to-transparent pointer-events-none" />

      {/* Vault Keycard Shell */}
      <div className="w-full max-w-[400px] bg-gradient-to-b from-[#18181c] to-[#101013] border border-[#2b2b33] rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Top Rim Metallic Specular Highlight */}
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-[#24242c] pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#22222a] border border-[#30303c] flex items-center justify-center text-white shadow-xs">
              <Key className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                Hardware Vault Token
              </h3>
              <p className="text-[10px] font-mono text-zinc-500">
                SERIAL // 9482-ZIPTABS
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
            ONLINE
          </span>
        </div>

        {/* Middle: 3 Tactile Milestone Steps */}
        <div className="space-y-2.5 mb-6 text-xs">
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              progress >= 30
                ? "bg-[#16211c] border-emerald-500/30 text-emerald-300"
                : "bg-[#18181f] border-[#292934] text-zinc-500"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  progress >= 30
                    ? "bg-emerald-500 text-black"
                    : "bg-[#252530] text-zinc-400"
                }`}
              >
                {progress >= 30 ? <Check className="w-3 h-3 stroke-[3]" /> : "1"}
              </div>
              <span className="font-semibold text-[11px]">Security Handshake</span>
            </div>
            <span className="font-mono text-[10px] opacity-80">
              {progress >= 30 ? "PASSED" : "WAITING"}
            </span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              progress >= 65
                ? "bg-[#16211c] border-emerald-500/30 text-emerald-300"
                : "bg-[#18181f] border-[#292934] text-zinc-500"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  progress >= 65
                    ? "bg-emerald-500 text-black"
                    : "bg-[#252530] text-zinc-400"
                }`}
              >
                {progress >= 65 ? <Check className="w-3 h-3 stroke-[3]" /> : "2"}
              </div>
              <span className="font-semibold text-[11px]">Database Cryptography</span>
            </div>
            <span className="font-mono text-[10px] opacity-80">
              {progress >= 65 ? "DECRYPTED" : progress >= 30 ? "SYNCING..." : "PENDING"}
            </span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              progress >= 95
                ? "bg-[#16211c] border-emerald-500/30 text-emerald-300"
                : "bg-[#18181f] border-[#292934] text-zinc-500"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  progress >= 95
                    ? "bg-emerald-500 text-black"
                    : "bg-[#252530] text-zinc-400"
                }`}
              >
                {progress >= 95 ? <Check className="w-3 h-3 stroke-[3]" /> : "3"}
              </div>
              <span className="font-semibold text-[11px]">Hydrate Workspace</span>
            </div>
            <span className="font-mono text-[10px] opacity-80">
              {progress >= 95 ? "READY" : progress >= 65 ? "LOADING..." : "QUEUE"}
            </span>
          </div>
        </div>

        {/* Bottom Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>UNLOCKING WORKSPACE</span>
            <span className="text-white font-bold">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#202028] rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(255,255,255,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto pb-32 animate-in fade-in duration-200">
      {/* Lab Header */}
      <div className="border-b border-slate-200/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Loading Screen Design Lab
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Loading screen variations engineered to match the ZipTabs Obsidian Portal color scheme (<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">#000000 / #17171a / #26262b</code>).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fullscreen Preview</span>
        </button>
      </div>

      {/* Interactive Control Dashboard */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        {/* Row 1: Variation Switcher */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
            Select Loading Variation
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedVariation("obsidian-portal")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedVariation === "obsidian-portal"
                  ? "bg-zinc-950 text-white border-zinc-900 shadow-md ring-2 ring-zinc-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">1. Obsidian Portal</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${selectedVariation === "obsidian-portal" ? "bg-white text-black" : "bg-emerald-100 text-emerald-800"}`}>
                  MATCH
                </span>
              </div>
              <p className={`text-[11px] leading-tight ${selectedVariation === "obsidian-portal" ? "text-zinc-400" : "text-slate-500"}`}>
                Direct twin to the ZipTabs Login Page card &amp; colors.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedVariation("minimal-luxury")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedVariation === "minimal-luxury"
                  ? "bg-zinc-950 text-white border-zinc-900 shadow-md ring-2 ring-zinc-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">2. Minimalist Luxury</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${selectedVariation === "minimal-luxury" ? "bg-white text-black" : "bg-slate-200 text-slate-700"}`}>
                  VERCEL
                </span>
              </div>
              <p className={`text-[11px] leading-tight ${selectedVariation === "minimal-luxury" ? "text-zinc-400" : "text-slate-500"}`}>
                Boundless black, breathing glyph, hairline glow bar.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedVariation("command-hud")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedVariation === "command-hud"
                  ? "bg-zinc-950 text-white border-zinc-900 shadow-md ring-2 ring-zinc-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">3. Command HUD</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${selectedVariation === "command-hud" ? "bg-white text-black" : "bg-slate-200 text-slate-700"}`}>
                  CYBER
                </span>
              </div>
              <p className={`text-[11px] leading-tight ${selectedVariation === "command-hud" ? "text-zinc-400" : "text-slate-500"}`}>
                Dual-ring gyroscope, segmented track, terminal log stream.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedVariation("hardware-vault")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedVariation === "hardware-vault"
                  ? "bg-zinc-950 text-white border-zinc-900 shadow-md ring-2 ring-zinc-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">4. Hardware Vault</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${selectedVariation === "hardware-vault" ? "bg-white text-black" : "bg-slate-200 text-slate-700"}`}>
                  TOKEN
                </span>
              </div>
              <p className={`text-[11px] leading-tight ${selectedVariation === "hardware-vault" ? "text-zinc-400" : "text-slate-500"}`}>
                Encrypted keycard with 3-stage milestone checkpoints.
              </p>
            </button>
          </div>
        </div>

        {/* Row 2: Playback & Scrubbing Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          {/* Play / Pause / Reset Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause" : "Play Simulation"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setProgress(0);
                setIsPlaying(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Slider Scrubbing */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="text-xs font-bold text-slate-500 w-12 text-right font-mono">
              {progress}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => {
                setProgress(Number(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full accent-zinc-950 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Device Frame Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setDeviceFrame("desktop")}
              title="Desktop View"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                deviceFrame === "desktop"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceFrame("mobile")}
              title="Mobile Phone View"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                deviceFrame === "mobile"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage Preview Frame */}
      <div className="rounded-3xl border border-slate-200/90 bg-slate-950/5 p-4 sm:p-8 flex items-center justify-center min-h-[560px]">
        <div
          className={`transition-all duration-300 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 ${
            deviceFrame === "mobile"
              ? "w-[390px] h-[720px] ring-8 ring-zinc-900"
              : "w-full max-w-4xl h-[560px]"
          }`}
        >
          {selectedVariation === "obsidian-portal" && renderObsidianPortal()}
          {selectedVariation === "minimal-luxury" && renderMinimalLuxury()}
          {selectedVariation === "command-hud" && renderCommandHUD()}
          {selectedVariation === "hardware-vault" && renderHardwareVault()}
        </div>
      </div>

      {/* Design Color Harmony Palette (Login Page Match Reference) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Color Scheme &amp; Design Spec (Matches Login Screen)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="w-full h-8 rounded-lg bg-[#000000] border border-zinc-800 shadow-inner" />
            <div className="font-bold text-slate-900">Pure Obsidian</div>
            <div className="font-mono text-[10px] text-slate-500">#000000</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="w-full h-8 rounded-lg bg-[#17171a] border border-zinc-700 shadow-inner" />
            <div className="font-bold text-slate-900">Portal Card</div>
            <div className="font-mono text-[10px] text-slate-500">#17171a</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="w-full h-8 rounded-lg bg-[#222226] border border-zinc-700 shadow-inner" />
            <div className="font-bold text-slate-900">Input / Track</div>
            <div className="font-mono text-[10px] text-slate-500">#222226</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="w-full h-8 rounded-lg bg-[#26262b] border border-zinc-600 shadow-inner" />
            <div className="font-bold text-slate-900">Card Border</div>
            <div className="font-mono text-[10px] text-slate-500">#26262b</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="w-full h-8 rounded-lg bg-white border border-slate-300 shadow-inner" />
            <div className="font-bold text-slate-900">Stark White</div>
            <div className="font-mono text-[10px] text-slate-500">#ffffff</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="w-full h-8 rounded-lg bg-emerald-500 shadow-inner" />
            <div className="font-bold text-slate-900">Vault Emerald</div>
            <div className="font-mono text-[10px] text-slate-500">#10b981</div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN MODAL OVERLAY */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-200">
          {/* Exit Fullscreen Floating Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-5 right-5 z-[110] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all cursor-pointer flex items-center gap-2 shadow-2xl active:scale-95"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Exit Fullscreen (Esc)</span>
          </button>

          <div className="w-full h-full">
            {selectedVariation === "obsidian-portal" && renderObsidianPortal()}
            {selectedVariation === "minimal-luxury" && renderMinimalLuxury()}
            {selectedVariation === "command-hud" && renderCommandHUD()}
            {selectedVariation === "hardware-vault" && renderHardwareVault()}
          </div>
        </div>
      )}
    </div>
  );
}
