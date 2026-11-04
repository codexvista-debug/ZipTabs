"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  X,
  ArrowRight,
  Lock,
  Trash2,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info" | "security" | "destructive";
export type ToastPosition = "top-right" | "bottom-right" | "bottom-center" | "top-center" | "none";
export type ToastVariant = "sculpted-notch" | "capsule" | "monolith" | "floating-island";

export function getToastPosition(
  title?: string,
  explicitPosition?: ToastPosition
): "top-right" | "bottom-right" | "bottom-center" | "top-center" {
  if (explicitPosition && explicitPosition !== "none") return explicitPosition;
  const lower = (title || "").toLowerCase();
  if (
    lower.includes("delete") ||
    lower.includes("remove") ||
    lower.includes("purge") ||
    lower.includes("trash")
  ) {
    return "bottom-right";
  }
  return "top-center";
}

export const TOAST_POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-center":
    "fixed top-3 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[calc(100vw-32px)] sm:max-w-md pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200 flex justify-center",
  "top-right":
    "fixed top-3 sm:top-6 right-3 sm:right-6 left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 z-50 w-auto max-w-[calc(100vw-32px)] sm:max-w-md pointer-events-auto animate-in fade-in slide-in-from-top-3 sm:slide-in-from-right-3 duration-200 flex justify-center sm:justify-end",
  "bottom-right":
    "fixed bottom-20 sm:bottom-6 right-3 sm:right-6 left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 z-50 w-auto max-w-[calc(100vw-32px)] sm:max-w-md pointer-events-auto animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-right-3 duration-200 flex justify-center sm:justify-end",
  "bottom-center":
    "fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[calc(100vw-32px)] sm:max-w-md pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200 flex justify-center",
  none: "",
};

export interface ExecutiveToastProps {
  type?: ToastType;
  title: string;
  description?: string;
  headerMeta?: string;
  metric?: string;
  position?: ToastPosition;
  variant?: ToastVariant;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  durationMs?: number; // Defaults to extended 3500ms
}

export function ExecutiveToast({
  type = "success",
  title,
  description,
  headerMeta,
  metric,
  position,
  variant = "monolith",
  action,
  onClose,
  durationMs = 3500,
}: ExecutiveToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationMs);
  const startTimeRef = useRef(Date.now());
  const remainingRef = useRef(durationMs);

  useEffect(() => {
    setTimeLeft(durationMs);
    remainingRef.current = durationMs;
    startTimeRef.current = Date.now();
  }, [durationMs, title]);

  useEffect(() => {
    if (!durationMs || !onClose) return;
    if (isHovered) return;

    const intervalStep = 25;
    const interval = setInterval(() => {
      remainingRef.current = Math.max(0, remainingRef.current - intervalStep);
      setTimeLeft(remainingRef.current);
      if (remainingRef.current <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, intervalStep);

    return () => clearInterval(interval);
  }, [durationMs, onClose, isHovered]);

  const progressPercent = durationMs > 0 ? (timeLeft / durationMs) * 100 : 0;

  const defaultMeta =
    headerMeta ||
    (type === "error" || type === "destructive"
      ? "Firewall & Security"
      : type === "warning" || type === "security"
      ? "Vault Guard // AES-256"
      : type === "info"
      ? "AI & Intelligence"
      : "Supabase Vault");

  const defaultMetric =
    metric ||
    (type === "error"
      ? "Alert"
      : type === "destructive"
      ? "Purged"
      : type === "warning"
      ? "Warning"
      : type === "security"
      ? "Protected"
      : type === "info"
      ? "Info"
      : "Synced");

  // Icon renderer based on type
  const renderIcon = (sizeClass = "w-4 h-4") => {
    switch (type) {
      case "error":
        return <ShieldAlert className={`${sizeClass} text-rose-600 animate-pulse`} />;
      case "destructive":
        return <Trash2 className={`${sizeClass} text-rose-600`} />;
      case "warning":
        return <AlertTriangle className={`${sizeClass} text-amber-600`} />;
      case "security":
        return <Lock className={`${sizeClass} text-indigo-600`} />;
      case "info":
        return <Sparkles className={`${sizeClass} text-blue-600 animate-pulse`} />;
      case "success":
      default:
        return <CheckCircle2 className={`${sizeClass} text-emerald-600`} />;
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case "error":
      case "destructive":
        return "bg-rose-500";
      case "warning":
        return "bg-amber-500";
      case "security":
        return "bg-indigo-500";
      case "info":
        return "bg-blue-500";
      case "success":
      default:
        return "bg-emerald-500";
    }
  };

  // ----------------------------------------------------
  // VARIANT B: Executive Precision Capsule (Single-line)
  // Short, compact, horizontal single-line capsule
  // ----------------------------------------------------
  const renderCapsuleCard = (extraClasses = "") => (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-white/95 backdrop-blur-md rounded-full shadow-xl border border-zinc-200/90 pl-1.5 pr-2.5 py-1.5 flex items-center gap-2 sm:gap-2.5 max-w-full sm:max-w-md ring-1 ring-zinc-950/10 pointer-events-auto transition-transform hover:scale-[1.01] ${extraClasses}`}
    >
      {/* Dark Capsule Notch Tag */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 text-white rounded-full text-[9px] font-mono tracking-wider font-bold shrink-0 shadow-xs border border-zinc-800">
        <span className={`w-1.5 h-1.5 rounded-full ${getAccentColor()} animate-pulse`} />
        <span className="truncate max-w-[85px] sm:max-w-[100px]">{defaultMetric.toUpperCase()}</span>
      </div>

      {/* Title */}
      <div className="min-w-0 flex-1 truncate pr-1">
        <span className="text-xs font-black text-zinc-900 tracking-tight truncate block">{title}</span>
        {description && (
          <span className="text-[11px] text-zinc-500 ml-1.5 font-medium hidden sm:inline truncate">
            {description}
          </span>
        )}
      </div>

      {/* Action Button */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-black text-white text-[10px] font-bold shadow-2xs transition-colors shrink-0 cursor-pointer"
        >
          {action.label}
        </button>
      )}

      {/* Close Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-5 h-5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Close"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  // ----------------------------------------------------
  // VARIANT C: Monolith Command Bar (Default Desktop)
  // Slim, high-density HUD profile scaled for desktop
  // ----------------------------------------------------
  const renderMonolithCard = (extraClasses = "") => (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-zinc-200/90 overflow-hidden w-auto max-w-[calc(100vw-32px)] sm:max-w-md ring-1 ring-zinc-950/10 pointer-events-auto transition-transform hover:scale-[1.01] ${extraClasses}`}
    >
      {/* Monolith Dark Header Bar - Ultra-compact on mobile */}
      <div className="bg-zinc-950 text-white px-2.5 sm:px-3.5 py-1 sm:py-1.5 flex items-center justify-between border-b border-zinc-800 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full ${getAccentColor()} animate-pulse shrink-0`} />
          <span className="text-[9px] sm:text-[10px] font-mono tracking-wider font-semibold truncate text-zinc-200 uppercase">
            {defaultMeta}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {defaultMetric}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-4 h-4 rounded text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer ml-0.5"
              aria-label="Close"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Card Body - Slim executive profile */}
      <div className="px-2.5 sm:px-3.5 py-2 sm:py-3 flex items-center gap-2.5 sm:gap-3">
        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
          {renderIcon("w-3.5 h-3.5 sm:w-4 sm:h-4")}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs sm:text-sm font-black text-zinc-900 tracking-tight leading-snug truncate">
            {title}
          </h4>
          {description && (
            <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 leading-tight truncate">
              {description}
            </p>
          )}
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-[10px] sm:text-[11px] font-bold shrink-0 cursor-pointer transition-all shadow-xs"
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Bottom Progress Countdown Bar (Extended 3.5s) */}
      <div className="h-0.5 bg-zinc-100 overflow-hidden w-full">
        <div
          className={`h-full ${getAccentColor()} transition-all duration-75 ease-linear`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );

  // ----------------------------------------------------
  // VARIANT A: Sculpted Dynamic Island Notch
  // Matches the black/gray/white modal language
  // ----------------------------------------------------
  const renderSculptedCard = (extraClasses = "") => (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 overflow-hidden w-full max-w-[calc(100vw-24px)] sm:max-w-md transition-all duration-200 ring-1 ring-zinc-950/10 pointer-events-auto ${extraClasses}`}
    >
      {/* Creative Top: Sculpted Dynamic Island Notch */}
      <div className="flex justify-center -mt-px">
        <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1 bg-zinc-950 text-white rounded-b-xl shadow-xs text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${getAccentColor()}`} />
          <span className="truncate max-w-[150px] sm:max-w-[200px]">{defaultMeta.toUpperCase()}</span>
          <span className="text-zinc-600 text-[9px]">//</span>
          <span className="text-zinc-300 text-[9px] font-bold uppercase">{defaultMetric}</span>
        </div>
      </div>

      {/* Subtle Creative Sides: Gradient Rails */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-300 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-300 to-transparent pointer-events-none" />

      {/* Main Content Area */}
      <div className="p-3 sm:p-4 pt-2.5 sm:pt-3">
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
          {/* Recessed Precision Icon Well */}
          <div className="relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-50 border border-zinc-200/90 shadow-inner flex items-center justify-center mt-0.5 sm:mt-0">
            <span className={`absolute inset-0 rounded-xl border animate-ping opacity-15 ${getAccentColor()}`} />
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-zinc-200 shadow-2xs flex items-center justify-center">
              {renderIcon("w-3.5 h-3.5 sm:w-4 sm:h-4")}
            </div>
          </div>

          {/* Title & Description */}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-black text-zinc-900 tracking-tight leading-snug break-words">
              {title}
            </h4>
            {description && (
              <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 leading-relaxed break-words">
                {description}
              </p>
            )}
          </div>

          {/* Action Button */}
          {action && (
            <div className="shrink-0 flex items-center self-start sm:self-center">
              <button
                type="button"
                onClick={action.onClick}
                className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>{action.label}</span>
                <ArrowRight className="w-3 h-3 text-zinc-300" />
              </button>
            </div>
          )}

          {/* Close Button */}
          {onClose && (
            <div className="shrink-0 self-start sm:self-center -mr-1">
              <button
                type="button"
                onClick={onClose}
                className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Dismiss Animated Countdown Line */}
      <div className="h-0.5 bg-zinc-100 overflow-hidden w-full">
        <div
          className={`h-full ${getAccentColor()} transition-all duration-75 ease-linear`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );

  // ----------------------------------------------------
  // RENDER PIPELINE:
  // 1. Static Showcase Preview Mode (Design Lab position="none")
  // ----------------------------------------------------
  if (position === "none") {
    if (variant === "capsule") return renderCapsuleCard();
    if (variant === "sculpted-notch") return renderSculptedCard();
    return renderMonolithCard();
  }

  // ----------------------------------------------------
  // 2. Explicit Capsule Mode (forced capsule on mobile and desktop)
  // ----------------------------------------------------
  if (variant === "capsule") {
    const card = renderCapsuleCard();
    return position ? <div className={TOAST_POSITION_CLASSES[position]}>{card}</div> : card;
  }

  // ----------------------------------------------------
  // 3. Adaptive Mode (Standard across all tabs):
  // - Mobile (< sm / < 640px): STYLE 02 // Executive Precision Capsule
  // - Desktop (>= sm / >= 640px): Monolith Command Bar (or sculpted-notch)
  // ----------------------------------------------------
  const desktopCard =
    variant === "sculpted-notch"
      ? renderSculptedCard("hidden sm:block")
      : renderMonolithCard("hidden sm:block");

  const responsiveToast = (
    <>
      {renderCapsuleCard("sm:hidden")}
      {desktopCard}
    </>
  );

  if (position) {
    return <div className={TOAST_POSITION_CLASSES[position]}>{responsiveToast}</div>;
  }

  return responsiveToast;
}
