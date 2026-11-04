"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Trash2,
  Play,
  RotateCcw,
  Sliders,
  Layers,
  Eye,
  Check,
  Maximize2,
  Clock,
  Compass,
} from "lucide-react";
import {
  ExecutiveToast,
  ToastType,
  ToastPosition,
  ToastVariant,
} from "@/components/ui/ExecutiveToast";

interface ActiveToastState {
  id: number;
  type: ToastType;
  title: string;
  description: string;
  headerMeta: string;
  metric: string;
  position: ToastPosition;
  variant: ToastVariant;
  durationMs: number;
  hasAction?: boolean;
}

export function DesignLabView() {
  const [selectedPosition, setSelectedPosition] = useState<ToastPosition>("top-center");
  const [selectedVariant, setSelectedVariant] = useState<ToastVariant>("sculpted-notch");
  const [selectedDuration, setSelectedDuration] = useState<number>(2200);
  const [activeToast, setActiveToast] = useState<ActiveToastState | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const triggerToast = (
    type: ToastType,
    title: string,
    description: string,
    headerMeta: string,
    metric: string,
    hasAction = false,
    overrideVariant?: ToastVariant,
    overridePosition?: ToastPosition
  ) => {
    setActiveToast({
      id: Date.now(),
      type,
      title,
      description,
      headerMeta,
      metric,
      position: overridePosition || selectedPosition,
      variant: overrideVariant || selectedVariant,
      durationMs: selectedDuration,
      hasAction,
    });
  };

  return (
    <div className="space-y-8 sm:space-y-10 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 animate-in fade-in duration-200">
      {/* Active Live Toast Overlay */}
      {activeToast && (
        <ExecutiveToast
          key={activeToast.id}
          type={activeToast.type}
          title={activeToast.title}
          description={activeToast.description}
          headerMeta={activeToast.headerMeta}
          metric={activeToast.metric}
          position={activeToast.position}
          variant={activeToast.variant}
          durationMs={activeToast.durationMs}
          onClose={() => setActiveToast(null)}
          action={
            activeToast.hasAction
              ? {
                  label: "Undo",
                  onClick: () => {
                    setLastActionMessage(`Reverted: "${activeToast.title}"`);
                    setActiveToast(null);
                  },
                }
              : undefined
          }
        />
      )}

      {/* Lab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950 text-white text-xs font-mono font-bold tracking-wider mb-2 shadow-xs border border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>DESIGN LAB // NOTIFICATION SUITE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Notification Design & Motion Studio
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl leading-relaxed">
            Light-mode precision notification architectures styled with our signature black, gray,
            and white sculpted island aesthetic. Test live across screen positions and tab intents.
          </p>
        </div>

        {/* Global Live Preview Status */}
        <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-2xl shadow-2xs shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div className="text-xs">
            <div className="font-mono font-bold text-zinc-900">Live Engine Ready</div>
            <div className="text-[10px] text-zinc-400">Duration: {(selectedDuration / 1000).toFixed(1)}s auto-close</div>
          </div>
        </div>
      </div>

      {lastActionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between animate-in fade-in">
          <span>{lastActionMessage}</span>
          <button
            type="button"
            onClick={() => setLastActionMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Live Interactive Test Control Deck */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xl overflow-hidden">
        <div className="p-4 sm:p-6 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-700" />
              <span>Interactive Toast Control Deck</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Choose your target screen position, architecture variant, and auto-dismiss speed, then trigger live toasts.
            </p>
          </div>

          {/* Quick Clear Button */}
          {activeToast && (
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Dismiss Active Toast</span>
            </button>
          )}
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Controls Row: Position & Speed & Variant */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Target Screen Position */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-zinc-600" />
                <span>Screen Position</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "top-center", label: "Top Center (Island)" },
                  { id: "top-right", label: "Top Right (Docked)" },
                  { id: "bottom-center", label: "Bottom Center (Mobile)" },
                  { id: "bottom-right", label: "Bottom Right (Subtle)" },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setSelectedPosition(pos.id as ToastPosition)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
                      selectedPosition === pos.id
                        ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                        : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    <span>{pos.label}</span>
                    {selectedPosition === pos.id && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Style Variant */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-600" />
                <span>Default Architecture Style</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "sculpted-notch", label: "Variant A: Sculpted Notch (Signature)" },
                  { id: "capsule", label: "Variant B: Executive Precision Capsule" },
                  { id: "monolith", label: "Variant C: Monolith Command Bar" },
                ].map((varItem) => (
                  <button
                    key={varItem.id}
                    type="button"
                    onClick={() => setSelectedVariant(varItem.id as ToastVariant)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
                      selectedVariant === varItem.id
                        ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                        : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    <span>{varItem.label}</span>
                    {selectedVariant === varItem.id && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Snappiness / Auto-close duration */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Auto-Dismiss Speed</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { ms: 1800, label: "Snappy", sub: "1.8s" },
                  { ms: 2200, label: "Balanced", sub: "2.2s" },
                  { ms: 3500, label: "Extended", sub: "3.5s" },
                ].map((dur) => (
                  <button
                    key={dur.ms}
                    type="button"
                    onClick={() => setSelectedDuration(dur.ms)}
                    className={`p-2.5 rounded-xl text-center transition-all cursor-pointer border ${
                      selectedDuration === dur.ms
                        ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                        : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    <div className="text-xs font-bold">{dur.label}</div>
                    <div className={`text-[10px] font-mono ${selectedDuration === dur.ms ? "text-zinc-300" : "text-zinc-400"}`}>
                      {dur.sub}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 leading-normal pt-1">
                Notice: Hovering your mouse over the notification pauses the countdown automatically.
              </p>
            </div>
          </div>

          {/* Trigger Buttons by Intent */}
          <div className="pt-4 border-t border-zinc-100">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-3">
              Trigger Live Notification Scenarios:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Trigger 1: Vault Sync */}
              <button
                type="button"
                onClick={() =>
                  triggerToast(
                    "success",
                    "Contact Encrypted & Saved",
                    "Vikas Arora saved with SHA-256 hashes and AES-256 cipher.",
                    "Supabase Cloud Vault",
                    "Synced"
                  )
                }
                className="p-3 rounded-2xl bg-white hover:bg-emerald-50/50 border border-zinc-200 hover:border-emerald-300 transition-all text-left group shadow-xs cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    SUCCESS
                  </span>
                </div>
                <div className="text-xs font-black text-zinc-900 group-hover:text-emerald-900 truncate">
                  Cloud Vault Synced
                </div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">Directory & Invoices</div>
              </button>

              {/* Trigger 2: Security & Encryption */}
              <button
                type="button"
                onClick={() =>
                  triggerToast(
                    "security",
                    "Vault Security Updated",
                    "Salted SHA-256 hash digests committed to Supabase tables.",
                    "Security Subsystem",
                    "Protected"
                  )
                }
                className="p-3 rounded-2xl bg-white hover:bg-indigo-50/50 border border-zinc-200 hover:border-indigo-300 transition-all text-left group shadow-xs cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    SECURITY
                  </span>
                </div>
                <div className="text-xs font-black text-zinc-900 group-hover:text-indigo-900 truncate">
                  Hashed & Salted Lock
                </div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">Logins & Credentials</div>
              </button>

              {/* Trigger 3: Warning / Firewall */}
              <button
                type="button"
                onClick={() =>
                  triggerToast(
                    "warning",
                    "Lockdown Mode Armed",
                    "External IP ranges restricted; 1 session authenticated.",
                    "Master Control",
                    "Restricted"
                  )
                }
                className="p-3 rounded-2xl bg-white hover:bg-amber-50/50 border border-zinc-200 hover:border-amber-300 transition-all text-left group shadow-xs cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                    WARNING
                  </span>
                </div>
                <div className="text-xs font-black text-zinc-900 group-hover:text-amber-900 truncate">
                  Emergency Lockdown
                </div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">Firewall & Access</div>
              </button>

              {/* Trigger 4: AI & Background Task */}
              <button
                type="button"
                onClick={() =>
                  triggerToast(
                    "info",
                    "Voice Note Transcribed",
                    "Audio recording transcribed with 99.4% speech confidence.",
                    "Antigravity AI",
                    "Completed"
                  )
                }
                className="p-3 rounded-2xl bg-white hover:bg-blue-50/50 border border-zinc-200 hover:border-blue-300 transition-all text-left group shadow-xs cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    AI INTELLIGENCE
                  </span>
                </div>
                <div className="text-xs font-black text-zinc-900 group-hover:text-blue-900 truncate">
                  AI Voice Transcription
                </div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">Notes & Audio</div>
              </button>

              {/* Trigger 5: Reversible Purge with Undo Action */}
              <button
                type="button"
                onClick={() =>
                  triggerToast(
                    "destructive",
                    "Vendor Record Archived",
                    "Penske Logistics removed from live directory.",
                    "Directory Subsystem",
                    "Archived",
                    true
                  )
                }
                className="p-3 rounded-2xl bg-white hover:bg-rose-50/50 border border-zinc-200 hover:border-rose-300 transition-all text-left group shadow-xs cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                    WITH ACTION
                  </span>
                </div>
                <div className="text-xs font-black text-zinc-900 group-hover:text-rose-900 truncate">
                  Purge with Undo
                </div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">Reversible Action</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Side-by-Side Visual Architecture Showcase */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Eye className="w-5 h-5 text-zinc-700" />
            <span>Side-by-Side Architecture Showcase</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            Compare each notification variant directly without waiting for auto-dismissal. Inspect typography, dynamic island notches, and proportion balance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Variant A Card */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                  STYLE 01 // SIGNATURE
                </span>
                <h3 className="text-sm font-black text-zinc-900 mt-1">Sculpted Dynamic Notch</h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  triggerToast(
                    "success",
                    "Vendor Created & Encrypted",
                    "Uniset Dynamics saved with AES-256 cipher.",
                    "Supabase Cloud Vault",
                    "Synced",
                    false,
                    "sculpted-notch",
                    "top-center"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-bold hover:bg-black transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Play className="w-3 h-3" />
                <span>Test Live</span>
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Features the exact black sculpted island notch you liked on Note Details & Audit Trail popups. Light-mode white card body, recessed icon well, gradient side rails, and progress bar.
            </p>

            {/* Static Mock Rendering */}
            <div className="p-3 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 flex justify-center">
              <ExecutiveToast
                type="success"
                title="Vendor Created & Encrypted"
                description="Uniset Dynamics saved with AES-256 cipher."
                headerMeta="Supabase Cloud Vault"
                metric="Synced"
                position="none"
                variant="sculpted-notch"
                durationMs={0}
              />
            </div>

            <div className="text-[11px] font-mono text-zinc-400 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
              <strong>Best Placement:</strong> Top-Center (Hero Drop) or Top-Right (Executive Desk).
            </div>
          </div>

          {/* Variant B Card */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                  STYLE 02 // HIGH-DENSITY
                </span>
                <h3 className="text-sm font-black text-zinc-900 mt-1">Executive Precision Capsule</h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  triggerToast(
                    "success",
                    "Phone Copied",
                    "1 (240) 252-1818 copied to clipboard.",
                    "Clipboard",
                    "Copied",
                    false,
                    "capsule",
                    "bottom-center"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-bold hover:bg-black transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Play className="w-3 h-3" />
                <span>Test Live</span>
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Ultra-compact, horizontal single-line capsule. Takes up minimal screen estate; perfect for quick copy confirmations, real-time sync beacons, and mobile action feedback.
            </p>

            {/* Static Mock Rendering */}
            <div className="p-3 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 flex justify-center">
              <ExecutiveToast
                type="success"
                title="Phone Copied"
                description="1 (240) 252-1818 copied"
                headerMeta="Clipboard"
                metric="Copied"
                position="none"
                variant="capsule"
                durationMs={0}
              />
            </div>

            <div className="text-[11px] font-mono text-zinc-400 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
              <strong>Best Placement:</strong> Bottom-Center (Floating Pill above mobile bar) or Top-Center.
            </div>
          </div>

          {/* Variant C Card */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                  STYLE 03 // DOCKED
                </span>
                <h3 className="text-sm font-black text-zinc-900 mt-1">Monolith Command Bar</h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  triggerToast(
                    "warning",
                    "Network Lockdown Activated",
                    "Strict IP verification enforced across 948 records.",
                    "Firewall Guard",
                    "Active",
                    false,
                    "monolith",
                    "top-right"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-bold hover:bg-black transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Play className="w-3 h-3" />
                <span>Test Live</span>
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Integrated dark header bar at the top edge of the card, housing the subsystem title and status metric chip. Clean white body below with recessed icon and action trigger.
            </p>

            {/* Static Mock Rendering */}
            <div className="p-3 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 flex justify-center">
              <ExecutiveToast
                type="warning"
                title="Lockdown Activated"
                description="Strict IP verification enforced."
                headerMeta="Firewall Guard"
                metric="Active"
                position="none"
                variant="monolith"
                durationMs={0}
              />
            </div>

            <div className="text-[11px] font-mono text-zinc-400 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
              <strong>Best Placement:</strong> Top-Right or Bottom-Right docked corners.
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Recommended Placement Map across tabs */}
      <div className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="max-w-2xl mb-6">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
            INTEGRATION PROPOSAL
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-2">
            Cross-Tab Position & Motion Blueprint
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
            Based on your requirement to place notifications across different tabs and positions with tailored animations, here is our suggested distribution:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">Top-Center (Island)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300">
                HERO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              High-importance system events: Vanish Mode toggle, Master Lockdown switch, and Key derivations.
            </p>
            <div className="text-[10px] font-mono text-zinc-500 pt-1">
              Tab: <code>Master Control</code>, <code>Logins</code>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">Top-Right (Docked)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                STANDARD
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Desktop creation & update confirmations: New vendor added, invoice edited, quick note saved.
            </p>
            <div className="text-[10px] font-mono text-zinc-500 pt-1">
              Tab: <code>Directory</code>, <code>Invoices</code>, <code>Notes</code>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">Bottom-Center (Pill)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300">
                MOBILE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Streamlined capsule appearing just above the mobile bottom navigation bar for quick feedback without obscuring view.
            </p>
            <div className="text-[10px] font-mono text-zinc-500 pt-1">
              Tab: <code>All Tabs on Mobile</code>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">Bottom-Right (Audit)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300">
                ACTIONABLE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Destructive & reversible actions: "Record moved to trash", equipped with instant 5-second [Undo] button.
            </p>
            <div className="text-[10px] font-mono text-zinc-500 pt-1">
              Tab: <code>Invoices</code>, <code>Directory</code>, <code>Drive</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
