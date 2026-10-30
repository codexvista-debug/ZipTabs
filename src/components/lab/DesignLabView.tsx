"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
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
  Compass,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Eye,
  KeyRound,
  Shield,
  FileCheck,
} from "lucide-react";

type NotifCategory = "security" | "success" | "warning" | "info";
type ProfessionalStyleId = "chrono-dial" | "instrument-gyro" | "architectural-chassis" | "studio-capsule";

interface NotificationSample {
  category: NotifCategory;
  title: string;
  subtitle: string;
  badge: string;
  metric: string;
  actionText: string;
  headerMeta: string;
}

const NOTIFICATION_PAYLOADS: Record<NotifCategory, NotificationSample> = {
  security: {
    category: "security",
    title: "Unauthorized IP Evicted",
    subtitle: "Vanish Mode rerouted IP 192.168.1.104 to Wikipedia decoy safely.",
    badge: "Security Defense",
    metric: "403 Evicted",
    actionText: "Inspect Network",
    headerMeta: "Chief Security Engine",
  },
  success: {
    category: "success",
    title: "Document Stashed in Vault",
    subtitle: "September_P2.xlsx uploaded and encrypted with AES-256 cloud storage.",
    badge: "Cloud Storage",
    metric: "+89.9 KB Freed",
    actionText: "Open in Drive",
    headerMeta: "Supabase Vault Sync",
  },
  warning: {
    category: "warning",
    title: "Cloud Quota at 85%",
    subtitle: "21.4 MB of 25.0 MB quota consumed. Review 30-day temporary stash.",
    badge: "Storage Quota",
    metric: "3.6 MB Remaining",
    actionText: "Review Files",
    headerMeta: "Drive Resource Alert",
  },
  info: {
    category: "info",
    title: "AI Vision Text Extracted",
    subtitle: "Processed screenshot: 4 invoice lines formatted directly into note.",
    badge: "Neural Vision",
    metric: "99.4% Accuracy",
    actionText: "View Note",
    headerMeta: "OCR Processing Complete",
  },
};

export function DesignLabView() {
  const [selectedCategory, setSelectedCategory] = useState<NotifCategory>("security");
  const [activeLiveToast, setActiveLiveToast] = useState<{
    styleId: ProfessionalStyleId;
    category: NotifCategory;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto dismiss live toast after 6 seconds
  useEffect(() => {
    if (activeLiveToast) {
      const timer = setTimeout(() => {
        setActiveLiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeLiveToast]);

  const triggerToast = (styleId: ProfessionalStyleId) => {
    setActiveLiveToast({ styleId, category: selectedCategory });
  };

  const payload = NOTIFICATION_PAYLOADS[selectedCategory];

  // Helper to render live floating toast in a portal
  const renderLiveToast = () => {
    if (!isMounted || !activeLiveToast || typeof document === "undefined") return null;

    return createPortal(
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[94%] sm:w-auto animate-in fade-in slide-in-from-top-6 duration-300 pointer-events-auto">
        {renderNotificationCard(activeLiveToast.styleId, activeLiveToast.category, true)}
      </div>,
      document.body
    );
  };

  // Render the specific notification style
  const renderNotificationCard = (
    styleId: ProfessionalStyleId,
    category: NotifCategory,
    isLive = false
  ) => {
    const data = NOTIFICATION_PAYLOADS[category];
    const handleClose = () => {
      if (isLive) setActiveLiveToast(null);
    };

    // =========================================================================
    // STYLE 01: Executive Chrono-Ring (Refined Calibration Dial)
    // Professional Swiss horology / executive metrics. No sci-fi crop marks.
    // =========================================================================
    if (styleId === "chrono-dial") {
      return (
        <div
          className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-zinc-200/90 overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-2xl shadow-zinc-950/15 max-w-lg ring-1 ring-zinc-900/10" : "w-full"
          }`}
        >
          <div className="p-4 sm:p-5 flex items-center gap-4">
            {/* Animated SVG Progress Ring with Soft Pulsing Beacon */}
            <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
              {/* Outer rotating smooth progress halo */}
              <svg
                className="absolute inset-0 w-full h-full animate-[spin_8s_linear_infinite]"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#f4f4f5"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={
                    category === "security"
                      ? "#e11d48"
                      : category === "warning"
                      ? "#d97706"
                      : category === "info"
                      ? "#2563eb"
                      : "#059669"
                  }
                  strokeWidth="4"
                  strokeDasharray="80 180"
                  strokeLinecap="round"
                />
              </svg>

              {/* Inner Clean Core Badge */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-xs ${
                  category === "security"
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : category === "warning"
                    ? "bg-amber-50 text-amber-600 border border-amber-200"
                    : category === "info"
                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                }`}
              >
                {category === "security" ? (
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                ) : category === "warning" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : category === "info" ? (
                  <Sparkles className="w-4 h-4 animate-pulse" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
              </div>
            </div>

            {/* Content Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md tracking-tight">
                  {data.badge}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">Just now</span>
              </div>

              <h4 className="text-sm font-black text-zinc-900 tracking-tight truncate">
                {data.title}
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5 truncate leading-relaxed">
                {data.subtitle}
              </p>
            </div>

            {/* Action Button & Dismiss */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{data.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-300" />
              </button>
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
    }

    // =========================================================================
    // STYLE 02: Precision Instrument Gyro (Minimalist Dual-Orbit)
    // Executive instrument dial with clean satellite dot and metric badge.
    // =========================================================================
    if (styleId === "instrument-gyro") {
      return (
        <div
          className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-zinc-200/90 overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-2xl shadow-zinc-950/15 max-w-lg ring-1 ring-zinc-900/10" : "w-full"
          }`}
        >
          {/* Subtle Left Accent Rail */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 ${
              category === "security"
                ? "bg-rose-500"
                : category === "warning"
                ? "bg-amber-500"
                : category === "info"
                ? "bg-blue-600"
                : "bg-emerald-500"
            }`}
          />

          <div className="p-4 sm:p-5 pl-5 sm:pl-6 flex items-center gap-4">
            {/* Animated Gyro Ring with Orbiting Micro-Dot */}
            <div className="relative shrink-0 w-11 h-11 flex items-center justify-center">
              {/* Outer Orbit Ring */}
              <div className="absolute inset-0 rounded-full border border-zinc-200" />

              {/* Orbiting Satellite Particle */}
              <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
                <span
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                    category === "security"
                      ? "bg-rose-500"
                      : category === "warning"
                      ? "bg-amber-500"
                      : category === "info"
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                  }`}
                />
              </div>

              {/* Center Icon */}
              <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                {category === "security" ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                ) : category === "warning" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : category === "info" ? (
                  <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
            </div>

            {/* Content Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider">
                  {data.badge}
                </span>
                <span className="text-zinc-300">•</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold text-zinc-600 bg-zinc-100 tabular-nums">
                  {data.metric}
                </span>
              </div>

              <h4 className="text-sm font-black text-zinc-900 tracking-tight truncate">
                {data.title}
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5 truncate leading-relaxed">
                {data.subtitle}
              </p>
            </div>

            {/* Action Button & Dismiss */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{data.actionText}</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
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
    }

    // =========================================================================
    // STYLE 03: Architectural Executive Chassis (Refined Cartridge)
    // Replaces the retro-synth look with a sleek luxury hardware aesthetic.
    // =========================================================================
    if (styleId === "architectural-chassis") {
      return (
        <div
          className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-zinc-200/90 overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-2xl shadow-zinc-950/15 max-w-lg ring-1 ring-zinc-900/10" : "w-full"
          }`}
        >
          {/* Executive Top Header Bar: Clean workspace context, zero retro clutter */}
          <div className="bg-gradient-to-r from-zinc-100/90 via-zinc-50 to-zinc-100/90 px-4 py-2 flex items-center justify-between border-b border-zinc-200/80">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  category === "security"
                    ? "bg-rose-500 ring-2 ring-rose-200"
                    : category === "warning"
                    ? "bg-amber-500 ring-2 ring-amber-200"
                    : category === "info"
                    ? "bg-blue-500 ring-2 ring-blue-200"
                    : "bg-emerald-500 ring-2 ring-emerald-200"
                }`}
              />
              <span className="text-[11px] font-bold text-zinc-800 tracking-tight">
                {data.headerMeta}
              </span>
            </div>

            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white text-zinc-600 border border-zinc-200 shadow-2xs tabular-nums">
              {data.metric}
            </span>
          </div>

          {/* Main Content Area */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
              {/* Recessed Precision Well with Subtle Breathing Icon */}
              <div className="relative shrink-0 w-11 h-11 rounded-2xl bg-zinc-50 border border-zinc-200 shadow-inner flex items-center justify-center">
                <span
                  className={`absolute inset-0 rounded-2xl border animate-ping opacity-20 ${
                    category === "security"
                      ? "border-rose-500"
                      : category === "warning"
                      ? "border-amber-500"
                      : category === "info"
                      ? "border-blue-500"
                      : "border-emerald-500"
                  }`}
                />

                <div className="w-8 h-8 rounded-xl bg-white border border-zinc-200 shadow-2xs flex items-center justify-center text-zinc-900">
                  {category === "security" ? (
                    <ShieldCheck className="w-4 h-4 text-rose-600 animate-pulse" />
                  ) : category === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ) : category === "info" ? (
                    <Zap className="w-4 h-4 text-blue-600 animate-bounce" />
                  ) : (
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-zinc-900 tracking-tight truncate">
                  {data.title}
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5 truncate leading-relaxed">
                  {data.subtitle}
                </p>
              </div>

              {/* Professional Action Button */}
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>{data.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-300" />
                </button>
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
        </div>
      );
    }

    // =========================================================================
    // STYLE 04: Studio Solid-State Capsule (Apple Pro / Clean Solid-State)
    // Minimalist single-chassis notification with smooth tactile badge.
    // =========================================================================
    return (
      <div
        className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-zinc-200/90 overflow-hidden transition-all duration-300 ${
          isLive ? "shadow-2xl shadow-zinc-950/15 max-w-lg ring-1 ring-zinc-900/10" : "w-full"
        }`}
      >
        <div className="p-4 sm:p-5 flex items-center gap-3.5">
          {/* Animated Status Beacon Container */}
          <div className="relative shrink-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                category === "security"
                  ? "bg-zinc-900 text-rose-400 border border-zinc-800"
                  : category === "warning"
                  ? "bg-zinc-900 text-amber-400 border border-zinc-800"
                  : category === "info"
                  ? "bg-zinc-900 text-blue-400 border border-zinc-800"
                  : "bg-zinc-900 text-emerald-400 border border-zinc-800"
              }`}
            >
              {category === "security" ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : category === "warning" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : category === "info" ? (
                <Radio className="w-5 h-5 animate-pulse" />
              ) : (
                <Check className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>

            {/* Micro Live Corner LED */}
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white animate-pulse ${
                category === "security"
                  ? "bg-rose-500"
                  : category === "warning"
                  ? "bg-amber-500"
                  : category === "info"
                  ? "bg-blue-500"
                  : "bg-emerald-500"
              }`}
            />
          </div>

          {/* Text Information Column */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-bold text-zinc-900 tracking-tight">
                {data.badge}
              </span>
              <span className="text-zinc-300">•</span>
              <span className="text-[11px] text-zinc-400 font-medium">
                {data.metric}
              </span>
            </div>
            <h4 className="text-sm font-black text-zinc-900 tracking-tight truncate">
              {data.title}
            </h4>
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {data.subtitle}
            </p>
          </div>

          {/* Action Button & Dismiss */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs hover:shadow-xs"
            >
              {data.actionText}
            </button>
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 text-white text-xs font-bold tracking-wider mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>DESIGN LAB // EXECUTIVE NOTIFICATIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-zinc-900" />
            <span>Professional Notification Studio</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl">
            Refined Swiss horology dials and architectural executive chassis — redesigned with corporate polish, smooth micro-animations, and zero gaming/cyberpunk aesthetics.
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
              { id: "security", label: "Security Eviction", dot: "bg-rose-500" },
              { id: "success", label: "Vault Encrypted", dot: "bg-emerald-500" },
              { id: "warning", label: "Quota Threshold", dot: "bg-amber-500" },
              { id: "info", label: "AI Vision OCR", dot: "bg-sky-500" },
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

      {/* Grid of 4 Refined Professional Concepts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Concept 1: Executive Chrono-Ring */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  REFINED 01 // SWISS CHRONO
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Executive Chrono-Ring
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Refined Swiss watchmaker dial: smooth continuous circular SVG progress halo, centered icon core, clean category badge, and luxury rounded-xl action button.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("chrono-dial")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            <div className="pt-2">
              {renderNotificationCard("chrono-dial", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Smooth SVG Ring • Executive Typography • Luxury Finish</span>
            <span className="font-mono text-zinc-400">#CHRONO-PRO</span>
          </div>
        </div>

        {/* Concept 2: Precision Instrument Gyro */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  REFINED 02 // DUAL-ORBIT INSTRUMENT
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Precision Instrument Gyro
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Minimalist instrument gauge: dual-orbit ring with a smooth traveling satellite dot, subtle vertical flank border, and a tactile outline chevron button.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("instrument-gyro")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            <div className="pt-2">
              {renderNotificationCard("instrument-gyro", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Orbiting Satellite • Flank Accent • Tactile Outline Action</span>
            <span className="font-mono text-zinc-400">#GYRO-MINIMAL</span>
          </div>
        </div>

        {/* Concept 3: Architectural Executive Chassis */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  REFINED 03 // EXECUTIVE CHASSIS
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Architectural Executive Chassis
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Refined hardware cartridge: sleek corporate top header bar with live workspace context, recessed tactile icon well with breathing pulse, and executive button.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("architectural-chassis")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            <div className="pt-2">
              {renderNotificationCard("architectural-chassis", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Top Context Bar • Recessed Well • Enterprise Action</span>
            <span className="font-mono text-zinc-400">#CHASSIS-CORP</span>
          </div>
        </div>

        {/* Concept 4: Studio Solid-State Capsule */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  REFINED 04 // SOLID-STATE STUDIO
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Studio Solid-State Capsule
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Apple Pro inspired solid-state look: high-contrast dark tile with an animated micro-LED corner beacon, clean typography, and a tactile light pill button.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("studio-capsule")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            <div className="pt-2">
              {renderNotificationCard("studio-capsule", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Dark Tile Anchor • Corner Beacon • Clean Pill Action</span>
            <span className="font-mono text-zinc-400">#SOLID-STATE</span>
          </div>
        </div>
      </div>

      {/* Interactive Helper Banner */}
      <div className="rounded-2xl bg-zinc-100/90 border border-zinc-200 p-4 text-xs text-zinc-600 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>
            Stripped away all gaming and cyberpunk traits (no bracket codes, no retro synth LEDs, no sci-fi crosshairs). Clean, professional, and ready for your review!
          </span>
        </div>
      </div>
    </div>
  );
}
