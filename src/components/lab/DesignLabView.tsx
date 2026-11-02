"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  Layers,
  Upload,
  FileSpreadsheet,
  Info,
  Clock,
  Activity,
  ShieldCheck,
} from "lucide-react";
import {
  ExecutiveToast,
  TOAST_POSITION_CLASSES,
} from "@/components/ui/ExecutiveToast";

const INVOICE_DATA = {
  title: "Overdue Invoices",
  subtitle: "Import spreadsheets (.csv or .xlsx) to analyze overdue aging balances and prepare vendor statements.",
  categoryTag: "WORKSPACE // AR AGING LEDGER",
  primaryActionText: "Upload File",
  kpis: [
    { label: "Total Overdue", value: "$3,500,238", color: "text-rose-700 bg-rose-50 border-rose-200/90" },
    { label: "Past Due", value: "261 Invoices", color: "text-amber-800 bg-amber-50 border-amber-200/90" },
    { label: "Active Vendors", value: "155 Accounts", color: "text-blue-700 bg-blue-50 border-blue-200/90" },
  ],
};

export function DesignLabView() {
  const [liveWorkspaceStyle, setLiveWorkspaceStyle] = useState<string>("style-01");
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ziptabs_active_header_style");
      if (saved) setLiveWorkspaceStyle(saved);
    } catch {}
  }, []);

  const applyStyleToLiveWorkspace = (styleId: string) => {
    try {
      localStorage.setItem("ziptabs_active_header_style", styleId);
      window.dispatchEvent(new CustomEvent("ziptabs-header-style-changed", { detail: styleId }));
      setLiveWorkspaceStyle(styleId);
      const nameMap: Record<string, string> = {
        "style-01": "Style 01 (Architectural Minimal Rail)",
        "style-02": "Style 02 (Aero Frost Capsule)",
        "style-03": "Style 03 (Metric Ribbons Horizon)",
        "style-04": "Style 04 (Fintech Clean Slate)",
      };
      setToastFeedback(`${nameMap[styleId] || styleId} is now LIVE on your workspace! Switch to Invoices tab to inspect.`);
      setTimeout(() => setToastFeedback(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
      {/* Toast Feedback (Top-Right Placement) */}
      {toastFeedback && (
        <div className={TOAST_POSITION_CLASSES["top-right"]}>
          <ExecutiveToast
            type="success"
            title="Design Lab Updated"
            description={toastFeedback}
            headerMeta="UI Design Studio"
            metric="Live Theme"
            onClose={() => setToastFeedback(null)}
            durationMs={4000}
          />
        </div>
      )}

      {/* Primary Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wider mb-2 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>DESIGN LAB // LIGHT EXECUTIVE STUDIO</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Header Concepts: Overdue Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Evaluate 4 elevated, light-themed header architectures designed for fast operational scanning, high-contrast clarity, and zero vertical bloat on mobile.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold self-start sm:self-center shadow-2xs">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Active Focus: Overdue Invoices</span>
        </div>
      </div>

      {/* UX Analysis Advisory */}
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-950 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">&quot;Light, Clean & Mobile Ergonomics&quot;</span>
          <p className="mt-1 text-slate-600 text-xs leading-relaxed">
            These 4 light concepts completely eliminate dark/indigo blocks in favor of crisp architectural white, frosted aero glass, high-density light metric ribbons, and fintech slate styling. Because mobile navigation is docked at the bottom, each concept stays razor-thin on phone screens (~44px) so invoice records remain front and center.
          </p>
        </div>
      </div>

      {/* Header Variations Grid */}
      <div className="space-y-6">
        {/* Style 01: Architectural Minimal Rail */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-01"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-700 uppercase tracking-wider border border-blue-200">
                STYLE 01 // ARCHITECTURAL MINIMAL RAIL
              </span>
              <span className="text-xs text-slate-500 font-medium">• Crisp White with Electric Blue Precision Rail</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#CLEAN-RAIL</span>
          </div>

          <div className="p-2 sm:p-3 rounded-xl bg-slate-50/60 border border-slate-200/60 mb-4">
            <div className="relative bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4.5 shadow-2xs hover:shadow-xs flex items-center justify-between gap-2.5 sm:gap-3 overflow-hidden">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                {/* Precision Blue Vertical Rail */}
                <div className="w-1 sm:w-1.5 self-stretch min-h-[32px] sm:min-h-[44px] bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.35)] shrink-0" />
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50/80 border border-blue-200/70 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="hidden sm:flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                      {INVOICE_DATA.categoryTag}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Ledger
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate flex items-center gap-1.5">
                    <span>{INVOICE_DATA.title}</span>
                    <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                    {INVOICE_DATA.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">{INVOICE_DATA.primaryActionText}</span>
                <span className="sm:hidden">Upload</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Razor-clean and structured. The royal blue rail gives an authoritative anchor while keeping the card lightweight.
            </div>
            {liveWorkspaceStyle === "style-01" ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                <span>Active on Live Workspace</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => applyStyleToLiveWorkspace("style-01")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>Apply to Live Workspace</span>
              </button>
            )}
          </div>
        </div>

        {/* Style 02: Aero Frost Capsule */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-02"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-50 text-sky-800 uppercase tracking-wider border border-sky-200">
                STYLE 02 // AERO FROST CAPSULE
              </span>
              <span className="text-xs text-slate-500 font-medium">• Translucent Frosted Glass Dock with Prismatic Top Laser Line</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#AERO-GLASS</span>
          </div>

          <div className="p-2 sm:p-3 rounded-xl bg-slate-50/60 border border-slate-200/60 mb-4">
            <div className="relative bg-gradient-to-r from-white/95 via-blue-50/30 to-slate-50/70 backdrop-blur-xl border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4.5 shadow-xs flex items-center justify-between gap-2.5 sm:gap-3 overflow-hidden ring-1 ring-blue-500/5">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-500 pointer-events-none" />
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white border border-slate-200/90 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                  <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
                      {INVOICE_DATA.title}
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Sync • 99.8%
                    </span>
                    <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                    {INVOICE_DATA.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs border border-slate-700/40 active:scale-95 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">{INVOICE_DATA.primaryActionText}</span>
                <span className="sm:hidden">Upload</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Ultra-clean frosted neo-glass dock. The high-contrast dark slate button acts as a clear call-to-action anchor.
            </div>
            {liveWorkspaceStyle === "style-02" ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                <span>Active on Live Workspace</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => applyStyleToLiveWorkspace("style-02")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>Apply to Live Workspace</span>
              </button>
            )}
          </div>
        </div>

        {/* Style 03: Metric Ribbons Horizon */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-03"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 uppercase tracking-wider border border-emerald-200">
                STYLE 03 // METRIC RIBBONS HORIZON
              </span>
              <span className="text-xs text-slate-500 font-medium">• Integrated Light-Mode Telemetry Badges (Overdue, Count, Accounts)</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#HIGH-DENSITY-METRICS</span>
          </div>

          <div className="p-2 sm:p-3 rounded-xl bg-slate-50/60 border border-slate-200/60 mb-4">
            <div className="relative bg-slate-50/90 border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs flex flex-col gap-2 overflow-hidden">
              <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white border border-slate-200/90 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
                      {INVOICE_DATA.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      {INVOICE_DATA.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">{INVOICE_DATA.primaryActionText}</span>
                  <span className="sm:hidden">Upload</span>
                </button>
              </div>

              {/* Integrated Light KPI Ribbons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {INVOICE_DATA.kpis.map((kpi, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold border shadow-2xs ${kpi.color}`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-medium opacity-80">{kpi.label}:</span>
                    <span>{kpi.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Functional power-user header. Light-tinted metric badges give immediate financial pulse without needing bulky cards.
            </div>
            {liveWorkspaceStyle === "style-03" ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                <span>Active on Live Workspace</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => applyStyleToLiveWorkspace("style-03")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>Apply to Live Workspace</span>
              </button>
            )}
          </div>
        </div>

        {/* Style 04: Fintech Clean Slate */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-04"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider border border-indigo-200">
                STYLE 04 // FINTECH CLEAN SLATE
              </span>
              <span className="text-xs text-slate-500 font-medium">• Enterprise Dual-Tone Card with Reconcile Stamp</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#FINTECH-MINIMAL</span>
          </div>

          <div className="p-2 sm:p-3 rounded-xl bg-slate-50/60 border border-slate-200/60 mb-4">
            <div className="relative bg-gradient-to-b from-blue-50/30 via-white to-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4.5 shadow-xs flex items-center justify-between gap-2.5 sm:gap-3 overflow-hidden">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-sky-100 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="hidden sm:flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-blue-600 uppercase">
                      ACCOUNTS RECEIVABLE
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      438 Records · Real-time Sync
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate flex items-center gap-1.5">
                    <span>{INVOICE_DATA.title}</span>
                    <span className="sm:hidden text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      AR
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                    {INVOICE_DATA.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs ring-1 ring-slate-900/10 active:scale-95 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">{INVOICE_DATA.primaryActionText}</span>
                <span className="sm:hidden">Upload</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Stripe/Linear-style enterprise fintech card. Subtle sky gradient container with discrete operational timestamp.
            </div>
            {liveWorkspaceStyle === "style-04" ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                <span>Active on Live Workspace</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => applyStyleToLiveWorkspace("style-04")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>Apply to Live Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
