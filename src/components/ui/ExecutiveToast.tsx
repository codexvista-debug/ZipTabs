"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  X,
  ArrowRight,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ExecutiveToastProps {
  type?: ToastType;
  title: string;
  description?: string;
  headerMeta?: string;
  metric?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  durationMs?: number;
}

export function ExecutiveToast({
  type = "success",
  title,
  description,
  headerMeta,
  metric,
  action,
  onClose,
  durationMs = 4000,
}: ExecutiveToastProps) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!durationMs || !onClose || isHovered) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose, isHovered]);

  const defaultMeta =
    headerMeta ||
    (type === "error"
      ? "Chief Security Guard"
      : type === "warning"
      ? "System Resource Alert"
      : type === "info"
      ? "AI & Background Operations"
      : "Supabase Cloud Vault");

  const defaultMetric =
    metric ||
    (type === "error"
      ? "Attention Required"
      : type === "warning"
      ? "Warning Alert"
      : type === "info"
      ? "Active Process"
      : "Synced");

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden w-full max-w-[calc(100vw-24px)] sm:max-w-lg transition-all duration-300 ring-1 ring-zinc-950/10"
    >
      {/* Executive Top Header Bar: Clean workspace context */}
      <div className="bg-gradient-to-r from-zinc-100/90 via-zinc-50 to-zinc-100/90 px-3.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 border-b border-zinc-200/80">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
              type === "error"
                ? "bg-rose-500 ring-2 ring-rose-200"
                : type === "warning"
                ? "bg-amber-500 ring-2 ring-amber-200"
                : type === "info"
                ? "bg-blue-500 ring-2 ring-blue-200"
                : "bg-emerald-500 ring-2 ring-emerald-200"
            }`}
          />
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-800 tracking-tight truncate">
            {defaultMeta}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-white text-zinc-600 border border-zinc-200 shadow-2xs tabular-nums shrink-0">
            {defaultMetric}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white hover:bg-zinc-200 text-zinc-400 hover:text-zinc-900 border border-zinc-200/80 shadow-2xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Close notification"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          {/* Recessed Precision Well with Subtle Breathing Icon */}
          <div className="relative shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-zinc-50 border border-zinc-200 shadow-inner flex items-center justify-center mt-0.5 sm:mt-0">
            <span
              className={`absolute inset-0 rounded-xl sm:rounded-2xl border animate-ping opacity-20 ${
                type === "error"
                  ? "border-rose-500"
                  : type === "warning"
                  ? "border-amber-500"
                  : type === "info"
                  ? "border-blue-500"
                  : "border-emerald-500"
              }`}
            />

            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white border border-zinc-200 shadow-2xs flex items-center justify-center text-zinc-900">
              {type === "error" ? (
                <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 animate-pulse" />
              ) : type === "warning" ? (
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              ) : type === "info" ? (
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              )}
            </div>
          </div>

          {/* Title & Subtitle + Responsive Action */}
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
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

            {action && (
              <div className="shrink-0 flex items-center self-start sm:self-center">
                <button
                  type="button"
                  onClick={action.onClick}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>{action.label}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-300" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
