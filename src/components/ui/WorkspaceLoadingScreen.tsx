"use client";

import React, { useState, useEffect } from "react";

interface WorkspaceLoadingScreenProps {
  progress?: number;
  statusText?: string;
  isInteractivePreview?: boolean;
  onExitPreview?: () => void;
}

const DEFAULT_STAGES = [
  "Securing encrypted workspace session...",
  "Querying Supabase PostgreSQL cloud...",
  "Reconciling aging buckets & statements...",
  "Calculating prompt discount rates...",
  "Finalizing workspace views...",
];

export function WorkspaceLoadingScreen({
  progress: externalProgress,
  statusText: externalStatus,
  isInteractivePreview = false,
  onExitPreview,
}: WorkspaceLoadingScreenProps) {
  const [progress, setProgress] = useState(externalProgress ?? 42);

  useEffect(() => {
    if (externalProgress !== undefined) {
      setProgress(externalProgress);
    }
  }, [externalProgress]);

  const currentStageText =
    externalStatus ||
    DEFAULT_STAGES[
      Math.min(
        Math.floor((progress / 100) * DEFAULT_STAGES.length),
        DEFAULT_STAGES.length - 1
      )
    ];

  return (
    <div
      className={`relative w-full overflow-hidden select-none font-sans ${
        isInteractivePreview
          ? "h-full min-h-[420px]"
          : "min-h-screen h-[100dvh]"
      }`}
    >
      {/* Interactive Exit Button when in Full Screen Preview */}
      {isInteractivePreview && onExitPreview && (
        <button
          type="button"
          onClick={onExitPreview}
          className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-xl bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 text-xs font-bold border border-slate-300 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <span>Exit Preview</span>
          <span className="text-[10px] text-slate-500">✕</span>
        </button>
      )}

      {/* ============================================================= */}
      {/* HYPERDRIVE BENTO (Clean Modern Light Mode)                   */}
      {/* ============================================================= */}
      <div className="w-full h-full min-h-[420px] bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#ffffff] relative flex flex-col items-center justify-center p-6 text-slate-900 overflow-hidden">
        {/* Subtle Ambient Grid Backdrop in Soft Slate */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f060_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f060_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* Luminous Ambient Accents */}
        <div className="absolute w-96 h-96 rounded-full bg-blue-500/10 blur-[110px] pointer-events-none -top-16" />
        <div className="absolute w-80 h-80 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none -bottom-16" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-xs sm:max-w-sm w-full">
          {/* Central Kinetic Gyro Prism */}
          <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
            {/* Luminous Blue Aura */}
            <div className="absolute inset-0 rounded-3xl bg-blue-400/20 blur-xl animate-pulse" />

            {/* Outer Segmented Electric Blue Gyro Ring */}
            <svg
              className="absolute inset-0 w-full h-full animate-spin"
              style={{ animationDuration: "8s" }}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="#e2e8f0"
                strokeWidth="2.5"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeDasharray="24 50 16 35"
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Inner Counter-Rotating Dotted Emerald Ring */}
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
                strokeWidth="2"
                strokeDasharray="4 8"
                fill="none"
              />
            </svg>

            {/* Crisp Floating White Glass Pod with Zip Lightning */}
            <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200/90 backdrop-blur-md flex items-center justify-center shadow-xl shadow-blue-500/10 z-10">
              <svg
                className="w-7 h-7 text-blue-600 drop-shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          </div>

          {/* Brand Title & HYPER Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              ZipTabs
            </span>
            <span className="text-[10px] font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md shadow-2xs">
              v2.4 HYPER
            </span>
          </div>

          {/* Status Metric & Segmented Progress Bar */}
          <div className="w-full mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 flex items-center gap-1.5 truncate max-w-[210px] text-left">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate font-semibold">{currentStageText}</span>
              </span>
              <span className="font-black text-blue-600 shrink-0 font-mono">
                {progress}%
              </span>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 flex items-center shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/40 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Clean White Bento Telemetry Chips */}
          <div className="grid grid-cols-3 gap-2 mt-5 w-full">
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
              <div className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                Database
              </div>
              <div className="text-xs font-black text-emerald-600 font-mono mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />{" "}
                Synced
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
              <div className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                Security
              </div>
              <div className="text-xs font-black text-blue-600 font-mono mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />{" "}
                AES-256
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
              <div className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                Latency
              </div>
              <div className="text-xs font-black text-slate-800 font-mono mt-0.5">
                18ms
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Retain BentoLoadingScreen export alias for modularity
export const BentoLoadingScreen = WorkspaceLoadingScreen;
