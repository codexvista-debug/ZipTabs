"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FlaskConical,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  X,
  Bell,
  Play,
  RotateCcw,
  Zap,
  Radio,
  Lock,
  ArrowRight,
  HardDrive,
  Activity,
  Layers,
  Flame,
  Check,
  RefreshCw,
} from "lucide-react";

type NotifCategory = "success" | "security" | "warning" | "info";
type NotifStyleId = "dynamic-island" | "tactical-hud" | "telemetry-synth" | "ambient-aurora";

interface NotificationSample {
  category: NotifCategory;
  title: string;
  subtitle: string;
  badge: string;
  actionText?: string;
}

const SAMPLE_PAYLOADS: Record<NotifCategory, NotificationSample> = {
  success: {
    category: "success",
    title: "File Encrypted & Stashed",
    subtitle: "September_P2.xlsx uploaded to Supabase Vault (89.9 KB reclaimed)",
    badge: "AES-256 SYNCED",
    actionText: "View Vault",
  },
  security: {
    category: "security",
    title: "Unauthorized IP Evicted",
    subtitle: "Vanish Mode automatically redirected 192.168.1.104 to decoy",
    badge: "DEFENSE ACTIVE",
    actionText: "Inspect IP",
  },
  warning: {
    category: "warning",
    title: "Cloud Storage at 82%",
    subtitle: "18.4 MB of 25.0 MB quota consumed. Review 30d temp files",
    badge: "QUOTA THRESHOLD",
    actionText: "Clean Drive",
  },
  info: {
    category: "info",
    title: "OCR Extraction Complete",
    subtitle: "34 words and 2 invoice totals extracted from screenshot",
    badge: "AI VISION ENGINE",
    actionText: "Open Note",
  },
};

export function DesignLabView() {
  const [selectedCategory, setSelectedCategory] = useState<NotifCategory>("success");
  const [activeLiveToast, setActiveLiveToast] = useState<{
    styleId: NotifStyleId;
    category: NotifCategory;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto dismiss live toast after 5 seconds
  useEffect(() => {
    if (activeLiveToast) {
      const timer = setTimeout(() => {
        setActiveLiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeLiveToast]);

  const triggerToast = (styleId: NotifStyleId) => {
    setActiveLiveToast({ styleId, category: selectedCategory });
  };

  const payload = SAMPLE_PAYLOADS[selectedCategory];

  // Helper to render live floating toast in a portal
  const renderLiveToast = () => {
    if (!isMounted || !activeLiveToast || typeof document === "undefined") return null;

    return createPortal(
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-6 duration-300 pointer-events-auto">
        {renderNotificationCard(activeLiveToast.styleId, activeLiveToast.category, true)}
      </div>,
      document.body
    );
  };

  // Render the specific notification style
  const renderNotificationCard = (
    styleId: NotifStyleId,
    category: NotifCategory,
    isLive = false
  ) => {
    const data = SAMPLE_PAYLOADS[category];
    const handleClose = () => {
      if (isLive) setActiveLiveToast(null);
    };

    // =========================================================================
    // STYLE 1: Dynamic Island Capsule (Companion to Sculpted Notch)
    // =========================================================================
    if (styleId === "dynamic-island") {
      return (
        <div
          className={`relative bg-zinc-950 text-white rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-zinc-950/60 ring-2 ring-zinc-700/50" : "w-full"
          }`}
        >
          {/* Top Edge Highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-400/40 to-transparent" />

          <div className="p-4 sm:p-4.5 flex items-center gap-3.5">
            {/* Animated Icon Container */}
            <div className="relative shrink-0 flex items-center justify-center">
              {/* Outer Pulsing Ring */}
              <div
                className={`absolute inset-0 rounded-2xl animate-ping opacity-25 ${
                  category === "security"
                    ? "bg-rose-500"
                    : category === "warning"
                    ? "bg-amber-500"
                    : category === "info"
                    ? "bg-sky-500"
                    : "bg-emerald-500"
                }`}
              />
              {/* Inner Badge */}
              <div className="relative w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                {category === "security" ? (
                  <div className="relative">
                    <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-zinc-950 animate-bounce" />
                  </div>
                ) : category === "warning" ? (
                  <div className="relative">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-zinc-950 animate-pulse" />
                  </div>
                ) : category === "info" ? (
                  <div className="relative">
                    <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-zinc-950" />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            {/* Content Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono tracking-widest font-bold text-zinc-400 uppercase">
                  {data.badge}
                </span>
                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                <span className="text-[10px] text-zinc-400 font-mono">JUST NOW</span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                {data.title}
              </h4>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5 leading-snug">
                {data.subtitle}
              </p>
            </div>

            {/* Action / Dismiss */}
            <div className="flex items-center gap-2 shrink-0">
              {data.actionText && (
                <button
                  type="button"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[11px] border border-zinc-700 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span>{data.actionText}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </button>
              )}
              {isLive && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Micro Progress Bar on Live */}
          {isLive && (
            <div className="h-0.5 w-full bg-zinc-900 overflow-hidden">
              <div
                className={`h-full w-full origin-left animate-[linear_5s_forwards] ${
                  category === "security"
                    ? "bg-rose-500"
                    : category === "warning"
                    ? "bg-amber-500"
                    : category === "info"
                    ? "bg-sky-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  animationName: "shrinkProgress",
                  animationDuration: "5000ms",
                  animationTimingFunction: "linear",
                }}
              />
            </div>
          )}
        </div>
      );
    }

    // =========================================================================
    // STYLE 2: Glassmorphic Tactical HUD (Apple Aero / Clean Linear)
    // =========================================================================
    if (styleId === "tactical-hud") {
      return (
        <div
          className={`relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-zinc-200/90 shadow-xl overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-2xl ring-1 ring-zinc-950/10" : "w-full"
          }`}
        >
          {/* Left Visual Accent Bar with Scanning Pulse */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1.5 ${
              category === "security"
                ? "bg-rose-500"
                : category === "warning"
                ? "bg-amber-500"
                : category === "info"
                ? "bg-blue-600"
                : "bg-emerald-500"
            }`}
          />

          <div className="p-4 sm:p-5 pl-5 sm:pl-6 flex items-start gap-3.5">
            {/* Animated Laser Badge */}
            <div className="relative shrink-0 mt-0.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs relative overflow-hidden ${
                  category === "security"
                    ? "bg-rose-50 border-rose-200/80 text-rose-600"
                    : category === "warning"
                    ? "bg-amber-50 border-amber-200/80 text-amber-600"
                    : category === "info"
                    ? "bg-blue-50 border-blue-200/80 text-blue-600"
                    : "bg-emerald-50 border-emerald-200/80 text-emerald-600"
                }`}
              >
                {/* Micro Scan Laser Effect passing through the icon */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-transparent -translate-y-full animate-pulse" />

                {category === "security" ? (
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                ) : category === "warning" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : category === "info" ? (
                  <Zap className="w-5 h-5 animate-bounce" />
                ) : (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>
            </div>

            {/* Content Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-tight uppercase ${
                    category === "security"
                      ? "bg-rose-100 text-rose-800"
                      : category === "warning"
                      ? "bg-amber-100 text-amber-800"
                      : category === "info"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {data.badge}
                </span>

                <span className="text-[10px] font-mono text-zinc-400">0.1s AGO</span>
              </div>

              <h4 className="text-sm font-black text-zinc-900 tracking-tight">
                {data.title}
              </h4>
              <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                {data.subtitle}
              </p>

              {/* Bottom Quick Action Strip */}
              {data.actionText && (
                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Touch-action authorized
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 hover:bg-black text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>{data.actionText}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Close Button */}
            {isLive && (
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // =========================================================================
    // STYLE 3: Telemetry Equalizer (Teenage Engineering / Hardware Precision)
    // =========================================================================
    if (styleId === "telemetry-synth") {
      return (
        <div
          className={`relative bg-white rounded-2xl border-2 border-zinc-900 shadow-2xl overflow-hidden font-sans transition-all duration-300 ${
            isLive ? "shadow-zinc-900/25 ring-4 ring-zinc-200" : "w-full"
          }`}
        >
          {/* Top Hardware Ruler Strip */}
          <div className="bg-zinc-900 text-zinc-300 px-3.5 py-1.5 flex items-center justify-between text-[10px] font-mono tracking-wider border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-white uppercase">{data.badge}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span>TEL-CH_01</span>
              <span>//</span>
              <span className="text-zinc-200 font-bold">2026.10</span>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3.5">
            {/* Animated Equalizer Waveform / Live Signal Meter */}
            <div className="shrink-0 w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-300 flex items-center justify-center gap-1 px-1.5 shadow-inner">
              <span className="w-1.5 bg-zinc-900 rounded-full animate-[pulse_1s_infinite_100ms] h-4" />
              <span className="w-1.5 bg-zinc-900 rounded-full animate-[pulse_1s_infinite_300ms] h-8" />
              <span className="w-1.5 bg-zinc-900 rounded-full animate-[pulse_1s_infinite_200ms] h-6" />
              <span className="w-1.5 bg-zinc-900 rounded-full animate-[pulse_1s_infinite_400ms] h-7" />
              <span className="w-1.5 bg-zinc-900 rounded-full animate-[pulse_1s_infinite_150ms] h-3" />
            </div>

            {/* Content Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-zinc-950 uppercase tracking-tight truncate">
                  {data.title}
                </h4>
              </div>
              <p className="text-[11px] font-mono text-zinc-600 truncate mt-0.5">
                {data.subtitle}
              </p>
            </div>

            {/* Action / Dismiss */}
            <div className="shrink-0 flex items-center gap-2">
              {data.actionText && (
                <button
                  type="button"
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-lg text-zinc-900 font-mono font-bold text-[10px] uppercase transition-colors cursor-pointer"
                >
                  [{data.actionText}]
                </button>
              )}
              {isLive && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors flex items-center justify-center cursor-pointer border border-zinc-300 font-mono text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // =========================================================================
    // STYLE 4: Ambient Aurora Beam (Stripe / Modern Luxury Halo)
    // =========================================================================
    return (
      <div
        className={`relative group bg-white rounded-3xl border border-zinc-200/80 shadow-2xl p-4 sm:p-5 overflow-hidden transition-all duration-300 ${
          isLive ? "shadow-zinc-900/15 ring-2 ring-zinc-900/10" : "w-full"
        }`}
      >
        {/* Ambient Gradient Background Glow */}
        <div
          className={`absolute -right-12 -top-12 w-36 h-36 rounded-full blur-2xl opacity-30 pointer-events-none transition-all ${
            category === "security"
              ? "bg-rose-500"
              : category === "warning"
              ? "bg-amber-500"
              : category === "info"
              ? "bg-sky-500"
              : "bg-emerald-500"
          }`}
        />

        <div className="relative flex items-center gap-3.5 z-10">
          {/* Animated Halo Orbit Icon */}
          <div className="relative shrink-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-105 ${
                category === "security"
                  ? "bg-gradient-to-tr from-rose-600 to-rose-400 shadow-rose-500/25"
                  : category === "warning"
                  ? "bg-gradient-to-tr from-amber-600 to-amber-400 shadow-amber-500/25"
                  : category === "info"
                  ? "bg-gradient-to-tr from-sky-600 to-sky-400 shadow-sky-500/25"
                  : "bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-emerald-500/25"
              }`}
            >
              {category === "security" ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : category === "warning" ? (
                <Flame className="w-5 h-5 animate-bounce" />
              ) : category === "info" ? (
                <Radio className="w-5 h-5 animate-pulse" />
              ) : (
                <Check className="w-5 h-5 stroke-[2.5] animate-[spin_3s_ease-in-out_infinite]" />
              )}
            </div>
          </div>

          {/* Text Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider">
                ZipTabs Notification
              </span>
              <span className="text-[10px] text-zinc-400">• Just now</span>
            </div>
            <h4 className="text-xs sm:text-sm font-black text-zinc-900 tracking-tight truncate">
              {data.title}
            </h4>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
              {data.subtitle}
            </p>
          </div>

          {/* Action Button & Dismiss */}
          <div className="shrink-0 flex items-center gap-2">
            {data.actionText && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[11px] font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
              >
                {data.actionText}
              </button>
            )}
            {isLive && (
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Live Portal Floater */}
      {renderLiveToast()}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 text-white text-xs font-mono font-bold tracking-wider mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>DESIGN LAB // NOTIFICATION STUDIO</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-zinc-900" />
            <span>Notification & Toast Concepts</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl">
            Interactive preview for unified notifications with live animated icons, micro-spinners, telemetry beacons, and instant action buttons across ZipTabs.
          </p>
        </div>

        {/* Global Live Toast Status */}
        {activeLiveToast && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-pulse shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Toast Active on Screen</span>
          </div>
        )}
      </div>

      {/* Category Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider pl-1">
            Simulate Event Type:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "success", label: "Success / Synced", dot: "bg-emerald-500" },
              { id: "security", label: "Security / Eviction", dot: "bg-rose-500" },
              { id: "warning", label: "Warning / Storage", dot: "bg-amber-500" },
              { id: "info", label: "AI / Vision OCR", dot: "bg-sky-500" },
            ] as const
          ).map((item) => {
            const isSelected = selectedCategory === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCategory(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-zinc-950 text-white shadow-sm ring-2 ring-zinc-900/20"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${item.dot} ${isSelected ? "animate-pulse" : ""}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of 4 Notification Styles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Style 1: Dynamic Island Capsule */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  STYLE 01 // NOTCH COMPANION
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Dynamic Island Capsule
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Deep-obsidian pill matching our new Sculpted Dynamic Notch. Features animated concentric radar rings and a live countdown bar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("dynamic-island")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            {/* Static Interactive Card Preview */}
            <div className="pt-2">
              {renderNotificationCard("dynamic-island", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Animated Rings • Progress Bar • Obsidian Theme</span>
            <span className="font-mono text-zinc-400">#SONOMA-ISLAND</span>
          </div>
        </div>

        {/* Style 2: Glassmorphic Tactical HUD */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  STYLE 02 // CYBER-CLEAN
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Glassmorphic Tactical HUD
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Frosted glass look with scanning laser line animation, high-contrast typography, and an interactive touch-action footer.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("tactical-hud")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            {/* Static Interactive Card Preview */}
            <div className="pt-2">
              {renderNotificationCard("tactical-hud", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Laser Sweep • Frosted Glass • Action Row</span>
            <span className="font-mono text-zinc-400">#TACTICAL-AERO</span>
          </div>
        </div>

        {/* Style 3: Telemetry Equalizer */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  STYLE 03 // HARDWARE PRECISION
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Telemetry Equalizer
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Inspired by Teenage Engineering synthesizers. Features live bouncing audio-wave bars and an engineered coordinate top ruler.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("telemetry-synth")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            {/* Static Interactive Card Preview */}
            <div className="pt-2">
              {renderNotificationCard("telemetry-synth", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Bouncing Waveform • Monospace Hex • Tech Bezel</span>
            <span className="font-mono text-zinc-400">#SYNTH-TEL</span>
          </div>
        </div>

        {/* Style 4: Ambient Aurora Beam */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  STYLE 04 // LUXURY MINIMAL
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Ambient Aurora Beam
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Clean modern luxury with an animated breathing back-glow halo, rotating 3D glyph icon, and a floating action badge.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("ambient-aurora")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            {/* Static Interactive Card Preview */}
            <div className="pt-2">
              {renderNotificationCard("ambient-aurora", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Breathing Aura • 3D Gradient Icon • Soft Depth</span>
            <span className="font-mono text-zinc-400">#AURORA-LUX</span>
          </div>
        </div>
      </div>

      {/* Feedback Prompt Card */}
      <div className="rounded-2xl bg-zinc-100/80 border border-zinc-200 p-4 text-xs text-zinc-600 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>
            Click <strong>"Test Live"</strong> on any style to see it appear as a real floating notification on your screen. You can also switch between <strong>Success, Security, Warning, and Info</strong> above to test each visual state.
          </span>
        </div>
      </div>
    </div>
  );
}
