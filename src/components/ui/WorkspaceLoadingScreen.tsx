"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Check } from "lucide-react";
import { ZipTabsLogo } from "@/components/ui/ZipTabsLogo";

interface WorkspaceLoadingScreenProps {
  progress?: number;
  statusText?: string;
  isInteractivePreview?: boolean;
  onExitPreview?: () => void;
}

const DEFAULT_STAGES = [
  { text: "Securing perimeter connection...", detail: "TLS 1.3 // AES-256 Handshake" },
  { text: "Querying Supabase Cloud Vault...", detail: "PostgreSQL Database Connection Pool" },
  { text: "Reconciling vendor accounts & invoices...", detail: "373 Records & Aging Buckets" },
  { text: "Hydrating reminders & encrypted notes...", detail: "IndexedDB Cloud Mirror Active" },
  { text: "Finalizing executive workspace...", detail: "Workspace Session Ready" },
];

export function WorkspaceLoadingScreen({
  progress: externalProgress,
  statusText: externalStatus,
  isInteractivePreview = false,
  onExitPreview,
}: WorkspaceLoadingScreenProps) {
  const [progress, setProgress] = useState(externalProgress ?? 22);

  useEffect(() => {
    if (externalProgress !== undefined) {
      setProgress(externalProgress);
      return;
    }

    // Smooth progressive loading curve for real session hydration
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 45) return prev + 3.5;
        if (prev < 75) return prev + 2.2;
        if (prev < 92) return prev + 1.2;
        if (prev < 97) return prev + 0.4;
        return prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [externalProgress]);

  const stageIndex = Math.min(
    Math.floor((progress / 100) * DEFAULT_STAGES.length),
    DEFAULT_STAGES.length - 1
  );
  const currentStage = DEFAULT_STAGES[stageIndex];
  const displayStatus = externalStatus || currentStage.text;

  return (
    <div
      className={`relative w-full overflow-hidden select-none font-sans bg-[#000000] flex items-center justify-center p-4 sm:p-6 ${
        isInteractivePreview ? "h-full min-h-[420px]" : "min-h-screen h-[100dvh]"
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

      {/* Subtle ambient bloom behind card */}
      <div className="absolute w-96 h-96 rounded-full bg-white/[0.03] blur-[120px] pointer-events-none" />

      {/* Main Obsidian Portal Card - Matches Login Page theme */}
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
              style={{ width: `${Math.max(Math.round(progress), 6)}%` }}
            >
              {progress >= 20 && (
                <span className="text-[11px] font-mono font-black text-black tracking-wider">
                  {Math.round(progress)}%
                </span>
              )}
            </div>
            {progress < 20 && (
              <span className="absolute right-3 text-[11px] font-mono font-bold text-zinc-400">
                {Math.round(progress)}%
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
            <span className="text-zinc-400 truncate max-w-[210px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">{displayStatus}</span>
            </span>
            <span className="text-zinc-500 font-mono text-[10px] shrink-0">
              STAGE {stageIndex + 1}/{DEFAULT_STAGES.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Retain BentoLoadingScreen export alias for modularity
export const BentoLoadingScreen = WorkspaceLoadingScreen;
