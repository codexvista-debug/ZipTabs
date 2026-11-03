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
          className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
        >
          <span>Exit Preview</span>
          <span className="text-[10px] text-white/70">✕</span>
        </button>
      )}

      {/* ============================================================= */}
      {/* HYPERDRIVE BENTO (Original High-Tech Cyber Dark Mode)        */}
      {/* ============================================================= */}
      <div className="w-full h-full min-h-[420px] bg-gradient-to-b from-[#080b11] via-[#0a0d14] to-[#05070a] relative flex flex-col items-center justify-center p-6 text-white overflow-hidden">
        {/* Ambient Subtle Cyber Grid Backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

        {/* Ambient Neon Blobs */}
        <div className="absolute w-80 h-80 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none -top-10" />
        <div className="absolute w-72 h-72 rounded-full bg-emerald-500/10 blur-[90px] pointer-events-none -bottom-10" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-xs sm:max-w-sm w-full">
          {/* Central Kinetic Gyro Prism */}
          <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
            {/* Luminous Blue Aura */}
            <div className="absolute inset-0 rounded-3xl bg-blue-500/20 blur-xl animate-pulse" />

            {/* Outer Segmented Electric Cyan Gyro Ring */}
            <svg
              className="absolute inset-0 w-full h-full animate-spin"
              style={{ animationDuration: "8s" }}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="#1e293b"
                strokeWidth="2.5"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="#38bdf8"
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

            {/* Floating Deep Glass Pod with Zip Lightning */}
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/80 backdrop-blur-md flex items-center justify-center shadow-xl shadow-black z-10">
              <svg
                className="w-7 h-7 text-blue-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          </div>

          {/* Brand Title & HYPER Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
              ZipTabs
            </span>
            <span className="text-[10px] font-mono font-black text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-md shadow-2xs">
              v2.4 HYPER
            </span>
          </div>

          {/* Status Metric & Segmented Progress Bar */}
          <div className="w-full mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5 truncate max-w-[210px] text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">{currentStageText}</span>
              </span>
              <span className="font-bold text-blue-400 shrink-0 font-mono">
                {progress}%
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 flex items-center shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Bento Telemetry Chips */}
          <div className="grid grid-cols-3 gap-2 mt-5 w-full">
            <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
              <div className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                Database
              </div>
              <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />{" "}
                Synced
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
              <div className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                Security
              </div>
              <div className="text-xs font-bold text-blue-400 font-mono mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{" "}
                AES-256
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
              <div className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                Latency
              </div>
              <div className="text-xs font-bold text-slate-300 font-mono mt-0.5">
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
