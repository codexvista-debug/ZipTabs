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
  Cpu,
  Compass,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Eye,
  KeyRound,
  Fingerprint,
} from "lucide-react";

type NotifCategory = "security" | "success" | "warning" | "info";
type CreativeStyleId = "sculpted-crown" | "calibration-dial" | "modular-cartridge" | "prism-blade";

interface NotificationSample {
  category: NotifCategory;
  title: string;
  subtitle: string;
  badge: string;
  metric: string;
  actionText: string;
  codeStamp: string;
}

const NOTIFICATION_PAYLOADS: Record<NotifCategory, NotificationSample> = {
  security: {
    category: "security",
    title: "Unauthorized IP Evicted",
    subtitle: "Vanish Mode active: IP 192.168.1.104 routed to Wikipedia decoy",
    badge: "DEFENSE LEVEL 1",
    metric: "403 EVICTION",
    actionText: "Inspect Network",
    codeStamp: "SEC-882 // ACTIVE",
  },
  success: {
    category: "success",
    title: "Document Vault Encrypted",
    subtitle: "September_P2.xlsx committed to Supabase Storage with AES-256 GCM",
    badge: "VAULT SECURED",
    metric: "+89.9 KB FREED",
    actionText: "Open in Drive",
    codeStamp: "SYNC-204 // 0.04s",
  },
  warning: {
    category: "warning",
    title: "Cloud Quota Approaching Limit",
    subtitle: "21.4 MB of 25.0 MB quota consumed. Review 30d temp files",
    badge: "85.6% CAPACITY",
    metric: "3.6 MB REMAINING",
    actionText: "Purge Stash",
    codeStamp: "WARN-419 // CHIEF",
  },
  info: {
    category: "info",
    title: "AI Vision Text Extracted",
    subtitle: "Processed receipt screenshot: 4 items detected & formatted into note",
    badge: "OCR PIPELINE",
    metric: "99.4% CONFIDENCE",
    actionText: "Review Note",
    codeStamp: "NEURAL-71 // DONE",
  },
};

export function DesignLabView() {
  const [selectedCategory, setSelectedCategory] = useState<NotifCategory>("security");
  const [activeLiveToast, setActiveLiveToast] = useState<{
    styleId: CreativeStyleId;
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

  const triggerToast = (styleId: CreativeStyleId) => {
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
    styleId: CreativeStyleId,
    category: NotifCategory,
    isLive = false
  ) => {
    const data = NOTIFICATION_PAYLOADS[category];
    const handleClose = () => {
      if (isLive) setActiveLiveToast(null);
    };

    // =========================================================================
    // CONCEPT 1: Sculpted Crown Micro-Notch (The Notification Twin to the Modal)
    // =========================================================================
    if (styleId === "sculpted-crown") {
      return (
        <div
          className={`relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-zinc-950/20 ring-1 ring-zinc-950/10 max-w-lg" : "w-full"
          }`}
        >
          {/* Creative Top: Sculpted Dynamic Island Notch */}
          <div className="flex justify-center -mt-px">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-zinc-950 text-white rounded-b-xl shadow-xs text-[9px] font-mono tracking-widest font-bold border-x border-b border-zinc-800">
              <span
                className={`w-1.5 h-1.5 rounded-full animate-ping ${
                  category === "security"
                    ? "bg-rose-500"
                    : category === "warning"
                    ? "bg-amber-400"
                    : category === "info"
                    ? "bg-sky-400"
                    : "bg-emerald-400"
                }`}
              />
              <span>{data.codeStamp}</span>
            </div>
          </div>

          {/* Creative Sides: Subtle Gradient Shadow Rails */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

          {/* Main Card Body */}
          <div className="p-4 sm:p-5 pt-3">
            <div className="flex items-start gap-3.5">
              {/* Animated Icon Box: Pulsing Concentric Radar Rings */}
              <div className="relative shrink-0 mt-0.5">
                {/* Ping wave */}
                <div
                  className={`absolute -inset-1.5 rounded-2xl animate-ping opacity-30 ${
                    category === "security"
                      ? "bg-rose-500"
                      : category === "warning"
                      ? "bg-amber-500"
                      : category === "info"
                      ? "bg-sky-500"
                      : "bg-emerald-500"
                  }`}
                />

                <div className="relative w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-md">
                  {category === "security" ? (
                    <div className="relative flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-zinc-900 animate-bounce" />
                    </div>
                  ) : category === "warning" ? (
                    <div className="relative flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-zinc-900 animate-pulse" />
                    </div>
                  ) : category === "info" ? (
                    <div className="relative flex items-center justify-center">
                      <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
                      <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-zinc-900" />
                    </div>
                  ) : (
                    <div className="relative flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-900 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wide bg-zinc-100 border border-zinc-200 text-zinc-800">
                      {data.badge}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-tight bg-zinc-900 text-white tabular-nums shadow-2xs">
                      {data.metric}
                    </span>
                  </div>

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

                <h4 className="text-sm font-black text-zinc-900 tracking-tight">
                  {data.title}
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  {data.subtitle}
                </p>

                {/* Footer Action Bar */}
                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 font-medium">
                    STATUS // CONFIRMED
                  </span>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 hover:bg-black text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <span>{data.actionText}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Micro Progress Bar on Live */}
          {isLive && (
            <div className="h-1 w-full bg-zinc-100 overflow-hidden">
              <div
                className={`h-full w-full origin-left ${
                  category === "security"
                    ? "bg-rose-500"
                    : category === "warning"
                    ? "bg-amber-500"
                    : category === "info"
                    ? "bg-sky-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  animation: "shrinkProgress 6s linear forwards",
                }}
              />
            </div>
          )}
        </div>
      );
    }

    // =========================================================================
    // CONCEPT 2: Calibration Dial (Swiss Horology & Precision Gauge)
    // =========================================================================
    if (styleId === "calibration-dial") {
      return (
        <div
          className={`relative bg-white rounded-3xl shadow-2xl border-2 border-zinc-300/90 overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-zinc-950/20 ring-4 ring-zinc-100 max-w-lg" : "w-full"
          }`}
        >
          {/* Precision 4-Corner Architectural Brackets */}
          <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold text-zinc-400 pointer-events-none select-none">
            ⌜
          </span>
          <span className="absolute top-1.5 right-1.5 text-[9px] font-mono font-bold text-zinc-400 pointer-events-none select-none">
            ⌝
          </span>
          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono font-bold text-zinc-400 pointer-events-none select-none">
            ⌞
          </span>
          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono font-bold text-zinc-400 pointer-events-none select-none">
            ⌟
          </span>

          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
              {/* Rotating SVG Calibration Dial / Compass Radar */}
              <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
                {/* Rotating Outer Ticks Ring */}
                <svg
                  className="absolute inset-0 w-full h-full animate-[spin_10s_linear_infinite]"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#e4e4e7"
                    strokeWidth="3"
                    strokeDasharray="4 6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke={
                      category === "security"
                        ? "#f43f5e"
                        : category === "warning"
                        ? "#f59e0b"
                        : category === "info"
                        ? "#0ea5e9"
                        : "#10b981"
                    }
                    strokeWidth="2.5"
                    strokeDasharray="20 40"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Inner Static White Core with Icon */}
                <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 shadow-inner flex items-center justify-center z-10">
                  {category === "security" ? (
                    <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                  ) : category === "warning" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : category === "info" ? (
                    <Activity className="w-5 h-5 text-sky-600 animate-pulse" />
                  ) : (
                    <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                  )}
                </div>
              </div>

              {/* Text Info Column */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-black text-zinc-900 tracking-wider uppercase bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                    {data.badge}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    DIAL-CAL // 01
                  </span>
                </div>

                <h4 className="text-sm font-black text-zinc-900 tracking-tight truncate">
                  {data.title}
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5 truncate leading-relaxed">
                  {data.subtitle}
                </p>
              </div>

              {/* Action Column */}
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>{data.actionText}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
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
    // CONCEPT 3: Tactile Modular Cartridge (Dieter Rams / Luxury Hardware)
    // =========================================================================
    if (styleId === "modular-cartridge") {
      return (
        <div
          className={`relative bg-zinc-50 rounded-3xl border border-zinc-300 shadow-2xl overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-zinc-950/20 max-w-lg" : "w-full"
          }`}
        >
          {/* Top Inset Metal Strip with Micro Screws & Vents */}
          <div className="bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 px-4 py-1.5 flex items-center justify-between border-b border-zinc-300/80">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
              <span className="text-[9px] font-mono font-bold text-zinc-700 tracking-widest pl-1 uppercase">
                CARTRIDGE-UNIT // ZP-2026
              </span>
            </div>

            {/* Stepped Animated LED Meter */}
            <div className="flex items-center gap-1">
              <span
                className={`w-1 h-2 rounded-xs animate-[pulse_800ms_infinite_100ms] ${
                  category === "security" ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
              <span
                className={`w-1 h-3 rounded-xs animate-[pulse_800ms_infinite_250ms] ${
                  category === "security" ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
              <span
                className={`w-1 h-2.5 rounded-xs animate-[pulse_800ms_infinite_400ms] ${
                  category === "security" ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
            </div>
          </div>

          {/* Cartridge Main Tray */}
          <div className="p-4 sm:p-5 bg-white">
            <div className="flex items-center gap-4">
              {/* Recessed Hardware Well Icon */}
              <div className="relative shrink-0 w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 shadow-inner flex items-center justify-center">
                {/* Floating micro orbit ring */}
                <span className="absolute inset-0 rounded-2xl border border-zinc-300/80 animate-ping opacity-25" />

                <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center justify-center text-zinc-900">
                  {category === "security" ? (
                    <Fingerprint className="w-5 h-5 text-rose-600 animate-pulse" />
                  ) : category === "warning" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" />
                  ) : category === "info" ? (
                    <Cpu className="w-5 h-5 text-sky-600 animate-pulse" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
              </div>

              {/* Content Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                    {data.badge}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 tabular-nums">
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

              {/* Mechanical Latch Button */}
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-mono font-bold uppercase transition-all shadow-md shadow-zinc-900/10 active:scale-95 cursor-pointer border border-zinc-800"
                >
                  [{data.actionText}]
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
    // CONCEPT 4: Prism Refraction Blade (Light-mode Holographic Crystal)
    // =========================================================================
    return (
      <div
        className={`relative bg-white rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden transition-all duration-300 ${
          isLive ? "shadow-zinc-950/20 max-w-lg ring-1 ring-zinc-950/10" : "w-full"
        }`}
      >
        {/* Top Edge: Iridescent Prismatic Light Beam Refraction */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-sky-400 to-rose-400 animate-[pulse_3s_infinite]" />

        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3.5">
            {/* Hexagonal Crystal Icon with Dual Orbiting Particles */}
            <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
              {/* Spinning Satellite Dot */}
              <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
                <span
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                    category === "security"
                      ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                      : category === "warning"
                      ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                      : category === "info"
                      ? "bg-sky-500 shadow-[0_0_8px_#0ea5e9]"
                      : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                  }`}
                />
              </div>

              {/* Counter-Spinning Satellite Dot */}
              <div className="absolute inset-1 animate-[spin_6s_linear_infinite_reverse]">
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zinc-900" />
              </div>

              {/* Crystal Hex Core */}
              <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-200 shadow-sm flex items-center justify-center text-zinc-900 z-10">
                {category === "security" ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                ) : category === "warning" ? (
                  <Flame className="w-5 h-5 text-amber-500 animate-bounce" />
                ) : category === "info" ? (
                  <Sparkles className="w-5 h-5 text-sky-600 animate-pulse" />
                ) : (
                  <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                )}
              </div>
            </div>

            {/* Text Information Column */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-black text-zinc-900 tracking-wider uppercase">
                  {data.badge}
                </span>
                <span className="text-zinc-300">•</span>
                <span className="text-[10px] font-mono text-zinc-500 font-bold">
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

            {/* Action Chip */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-900 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs hover:shadow-xs"
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
            <span>DESIGN LAB // NOTIFICATION STUDIO v2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-zinc-900" />
            <span>High-Craft Notification Concepts</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl">
            Clean architectural light-mode designs featuring live dynamic island notches, rotating calibration dials, hardware cartridge meters, and prismatic crystals.
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

      {/* Grid of 4 Detailed Notification Concepts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Concept 1: Sculpted Crown Micro-Notch */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  CONCEPT 01 // MODAL COMPANION
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Sculpted Crown Micro-Notch
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Direct companion to our winning modal: crisp white chassis, recessed dark top island notch with live pulsing beacon, flank gradient rails, and concentric radar icon.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("sculpted-crown")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            <div className="pt-2">
              {renderNotificationCard("sculpted-crown", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Sculpted Notch • Radar Waves • Flank Shadow Rails</span>
            <span className="font-mono text-zinc-400">#NOTCH-TWIN</span>
          </div>
        </div>

        {/* Concept 2: Calibration Dial */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  CONCEPT 02 // SWISS HOROLOGY
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Calibration Dial & Compass
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Precision measurement aesthetic: 4-corner register marks (`⌜ ⌝ ⌞ ⌟`), rotating circular SVG tickmarks dial, and tactile chevron dispatch button.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("calibration-dial")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            <div className="pt-2">
              {renderNotificationCard("calibration-dial", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Rotating Ticks • 4-Corner Brackets • Gauge Dial</span>
            <span className="font-mono text-zinc-400">#CHRONO-DIAL</span>
          </div>
        </div>

        {/* Concept 3: Tactile Modular Cartridge */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  CONCEPT 03 // DIETER RAMS HARDWARE
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Tactile Modular Cartridge
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  High-end audio/modular gear aesthetic: brushed aluminum top strip, 3-stage animated mechanical LED meter, recessed well icon, and slotted bracket action.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("modular-cartridge")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            <div className="pt-2">
              {renderNotificationCard("modular-cartridge", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Mechanical LEDs • Cartridge Tray • Recessed Well</span>
            <span className="font-mono text-zinc-400">#RAMS-UNIT</span>
          </div>
        </div>

        {/* Concept 4: Prism Refraction Blade */}
        <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  CONCEPT 04 // CRYSTALLINE REFRACTION
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Prism Refraction Blade
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Razor-thin prismatic light beam along the top edge, hexagonal crystal core with dual counter-orbiting satellite particles, and quick action chip.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerToast("prism-blade")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Live</span>
              </button>
            </div>

            <div className="pt-2">
              {renderNotificationCard("prism-blade", selectedCategory, false)}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Prism Beam • Dual Orbit Satellites • Chamfered Core</span>
            <span className="font-mono text-zinc-400">#PRISM-BLADE</span>
          </div>
        </div>
      </div>

      {/* Interactive Helper Banner */}
      <div className="rounded-2xl bg-zinc-100/90 border border-zinc-200 p-4 text-xs text-zinc-600 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>
            Every style is crafted in <strong>clean white / high-contrast light mode</strong> with dedicated animated micro-mechanics. Click <strong>"Test Live"</strong> on any concept to watch it float to the top of your screen with live exit progress.
          </span>
        </div>
      </div>
    </div>
  );
}
