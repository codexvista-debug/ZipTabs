"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  Layers,
  Upload,
  FileSpreadsheet,
  NotebookPen,
  LayoutDashboard,
  HardDrive,
  Plus,
  ArrowUpRight,
  X,
  Info,
} from "lucide-react";
import {
  ExecutiveToast,
  TOAST_POSITION_CLASSES,
} from "@/components/ui/ExecutiveToast";

type HeaderPreviewTab = "invoices" | "notes" | "dashboard" | "drive";

interface HeaderData {
  title: string;
  subtitle: string;
  categoryTag: string;
  icon: React.ReactNode;
  primaryActionText: string;
  primaryActionIcon: React.ReactNode;
  kpis: { label: string; value: string; color: string }[];
}

const TAB_HEADER_DATA: Record<HeaderPreviewTab, HeaderData> = {
  invoices: {
    title: "Overdue Invoices",
    subtitle: "Import spreadsheets (.csv or .xlsx) to analyze overdue aging balances and prepare vendor statements.",
    categoryTag: "WORKSPACE // AR LEDGER",
    icon: <FileSpreadsheet className="w-5 h-5 text-blue-600" />,
    primaryActionText: "Upload File",
    primaryActionIcon: <Upload className="w-4 h-4" />,
    kpis: [
      { label: "Total Overdue", value: "$3,500,238", color: "text-rose-600 bg-rose-50 border-rose-200" },
      { label: "Past Due", value: "261 Invoices", color: "text-amber-600 bg-amber-50 border-amber-200" },
      { label: "Active Vendors", value: "155 Accounts", color: "text-blue-600 bg-blue-50 border-blue-200" },
    ],
  },
  notes: {
    title: "Notes & Reminders",
    subtitle: "Store documents, screenshots, and track deadlines with 2-3 keyword auto-subjects.",
    categoryTag: "PRODUCTIVITY // SECURE SCRATCHPAD",
    icon: <NotebookPen className="w-5 h-5 text-indigo-600" />,
    primaryActionText: "New Note",
    primaryActionIcon: <Plus className="w-4 h-4" />,
    kpis: [
      { label: "Total Notes", value: "24 Stashed", color: "text-slate-800 bg-slate-100 border-slate-200" },
      { label: "Urgent Priority", value: "5 Action Items", color: "text-rose-600 bg-rose-50 border-rose-200" },
      { label: "OCR Vision", value: "Active", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    ],
  },
  dashboard: {
    title: "Executive Dashboard",
    subtitle: "High-level liquidity metrics, cash collections forecast, and workspace performance.",
    categoryTag: "FINANCE // EXECUTIVE COCKPIT",
    icon: <LayoutDashboard className="w-5 h-5 text-sky-600" />,
    primaryActionText: "Export Report",
    primaryActionIcon: <ArrowUpRight className="w-4 h-4" />,
    kpis: [
      { label: "Cash Flow", value: "+$418.2K", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { label: "DSO Ratio", value: "41.2 Days", color: "text-blue-600 bg-blue-50 border-blue-200" },
      { label: "Risk Index", value: "Low (1.4%)", color: "text-slate-800 bg-slate-100 border-slate-200" },
    ],
  },
  drive: {
    title: "Supabase Vault Drive",
    subtitle: "Encrypted AES-256 cloud storage for spreadsheets, receipts, and temporary documents.",
    categoryTag: "INFRASTRUCTURE // CLOUD VAULT",
    icon: <HardDrive className="w-5 h-5 text-emerald-600" />,
    primaryActionText: "Upload Asset",
    primaryActionIcon: <Upload className="w-4 h-4" />,
    kpis: [
      { label: "Used Storage", value: "21.4 MB / 25 MB", color: "text-amber-600 bg-amber-50 border-amber-200" },
      { label: "Retention Policy", value: "30-Day Auto Purge", color: "text-slate-800 bg-slate-100 border-slate-200" },
      { label: "Encryption", value: "AES-256 Bit", color: "text-blue-600 bg-blue-50 border-blue-200" },
    ],
  },
};

export function DesignLabView() {
  const [selectedPreviewTab, setSelectedPreviewTab] = useState<HeaderPreviewTab>("invoices");
  const [liveWorkspaceStyle, setLiveWorkspaceStyle] = useState<string>("style-02");
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
        "style-01": "Style 01 (Midnight Command Deck)",
        "style-02": "Style 02 (Royal Indigo Aurora)",
        "style-03": "Style 03 (Cyber HUD Console)",
        "style-04": "Style 04 (Frosted Aero Horizon)",
      };
      setToastFeedback(`${nameMap[styleId] || styleId} is now LIVE on your workspace! Switch tabs to inspect.`);
      setTimeout(() => setToastFeedback(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const currentTab = TAB_HEADER_DATA[selectedPreviewTab];

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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 text-white text-xs font-bold tracking-wider mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>DESIGN LAB // ARCHITECTURAL STUDIO</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            UI Design Explorations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Evaluate header architectures and styling variations before applying them across the workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold self-start sm:self-center shadow-2xs">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Tab Main Headers</span>
        </div>
      </div>

      {/* Header Context Switcher */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">
            Preview With Active Tab:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "invoices", label: "Overdue Invoices", icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
              { id: "notes", label: "Notes & Reminders", icon: <NotebookPen className="w-3.5 h-3.5" /> },
              { id: "dashboard", label: "Executive Dashboard", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
              { id: "drive", label: "Supabase Vault Drive", icon: <HardDrive className="w-3.5 h-3.5" /> },
            ] as const
          ).map((tab) => {
            const isSelected = selectedPreviewTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPreviewTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-700 border border-transparent"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* UX Analysis Advisory */}
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-950 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">&quot;Mobile Ergonomics & High-Density Operational Styling&quot;</span>
          <p className="mt-1 text-slate-600 text-xs leading-relaxed">
            Because mobile navigation is docked at the bottom, page headers must remain razor-thin on phone views (~44px) to preserve maximum vertical space for spreadsheets and notes. Below are 4 rich, detailed header explorations infused with our project&apos;s signature midnight navy, royal indigo, cyber emerald, and frosted aero glass palettes.
          </p>
        </div>
      </div>

      {/* Header Variations Grid */}
      <div className="space-y-6">
        {/* Style 01: Midnight Command Deck */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-01"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-950 text-blue-300 uppercase tracking-wider border border-blue-800/50">
                STYLE 01 // MIDNIGHT COMMAND DECK
              </span>
              <span className="text-xs text-slate-500 font-medium">• Executive Deep Cockpit with Ambient Light Ray</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#DARK-COCKPIT</span>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl bg-slate-950/5 border border-slate-200/60 mb-4">
            <div className="relative bg-gradient-to-r from-[#0c1427] via-[#0f1d38] to-[#142347] border border-[#1e325c] rounded-xl sm:rounded-2xl p-2.5 sm:p-5 shadow-lg overflow-hidden flex flex-row items-center justify-between gap-2.5 sm:gap-3">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 pointer-events-none" />
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-950/90 border border-blue-500/30 flex items-center justify-center shadow-inner shrink-0 text-blue-400">
                  {currentTab.icon}
                </div>
                <div className="min-w-0">
                  <div className="hidden sm:flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-blue-300 uppercase">
                      {currentTab.categoryTag}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      OPERATIONAL
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight truncate flex items-center gap-1.5">
                    <span>{currentTab.title}</span>
                    <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 truncate hidden sm:block">
                    {currentTab.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-blue-500/25 ring-1 ring-blue-400/30 cursor-pointer"
              >
                {currentTab.primaryActionIcon}
                <span className="hidden sm:inline">{currentTab.primaryActionText}</span>
                <span className="sm:hidden">Action</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Signature executive command cockpit. High-contrast midnight palette harmonizes with the mobile bottom bar.
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

        {/* Style 02: Royal Indigo Aurora */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-02"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 uppercase tracking-wider border border-indigo-800/50">
                STYLE 02 // ROYAL INDIGO AURORA
              </span>
              <span className="text-xs text-slate-500 font-medium">• Dual-Tone Horizon with Glowing Metric Badges</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#AURORA-INDIGO</span>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl bg-slate-950/5 border border-slate-200/60 mb-4">
            <div className="relative bg-gradient-to-r from-[#172554] via-[#1e1b4b] to-[#0f172a] border border-indigo-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 shadow-xl overflow-hidden flex flex-col gap-2">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 pointer-events-none" />
              <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                  <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-indigo-950/90 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0 shadow-xs">
                    {currentTab.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight truncate">
                        {currentTab.title}
                      </h2>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-400/40 text-[10px] font-bold text-indigo-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Live Sync
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 mt-0.5 truncate hidden sm:block">
                      {currentTab.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-500/30 cursor-pointer"
                >
                  {currentTab.primaryActionIcon}
                  <span className="hidden sm:inline">{currentTab.primaryActionText}</span>
                  <span className="sm:hidden">Action</span>
                </button>
              </div>

              {/* Telemetry Ribbons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {currentTab.kpis.map((kpi, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold border shadow-2xs ${
                      idx === 0
                        ? "text-rose-300 bg-rose-950/60 border-rose-500/40"
                        : idx === 1
                        ? "text-amber-300 bg-amber-950/60 border-amber-500/40"
                        : "text-cyan-300 bg-cyan-950/60 border-cyan-500/40"
                    }`}
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
              <strong>Verdict:</strong> Saturated royal indigo horizon with luminous multi-colored metric pills for instantaneous operational intelligence.
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

        {/* Style 03: Cyber HUD Console */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-03"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 uppercase tracking-wider border border-emerald-800/50">
                STYLE 03 // CYBER HUD CONSOLE
              </span>
              <span className="text-xs text-slate-500 font-medium">• Obsidian & Neon Emerald Monospace Telemetry</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#CYBER-EMERALD</span>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl bg-slate-950/5 border border-slate-200/60 mb-4">
            <div className="relative bg-gradient-to-r from-[#090d16] via-[#0d1726] to-[#080d1a] border border-emerald-500/30 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 shadow-xl overflow-hidden flex flex-row items-center justify-between gap-2.5 sm:gap-3 pl-3.5 sm:pl-6">
              <div className="absolute left-0 top-2 bottom-2 w-1 sm:w-1.5 bg-emerald-400 rounded-r-full shadow-[0_0_12px_#10b981]" />
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-black/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                  {currentTab.icon}
                </div>
                <div className="min-w-0">
                  <div className="hidden sm:flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      CYBER_HUD // {currentTab.categoryTag.split("//")[1]?.trim() || "CONSOLE"}
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight truncate font-mono flex items-center gap-1.5">
                    <span>{currentTab.title}</span>
                    <span className="sm:hidden text-[10px] text-emerald-400 font-mono font-bold">• HUD</span>
                  </h2>
                  <div className="hidden sm:flex items-center gap-2 mt-1">
                    {currentTab.kpis.map((kpi, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300"
                      >
                        {kpi.label}: {kpi.value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                {currentTab.primaryActionIcon}
                <span className="hidden sm:inline">{currentTab.primaryActionText}</span>
                <span className="sm:hidden">Run</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> High-density cyberpunk console. Left neon emerald rail with monospace telemetry signals.
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

        {/* Style 04: Frosted Aero Horizon */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-04"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 text-blue-800 uppercase tracking-wider border border-blue-200">
                STYLE 04 // FROSTED AERO HORIZON
              </span>
              <span className="text-xs text-slate-500 font-medium">• Prismatic Translucent Neo-Glass with Ambient Glow</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#AERO-GLASS</span>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/60 mb-4">
            <div className="relative bg-gradient-to-r from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border border-blue-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 shadow-md overflow-hidden flex flex-row items-center justify-between gap-2.5 sm:gap-3 ring-1 ring-blue-500/10">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-400 pointer-events-none" />
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-50/90 border border-blue-200/80 text-blue-600 shadow-2xs flex items-center justify-center shrink-0">
                  {currentTab.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
                      {currentTab.title}
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Sync • 99.8%
                    </span>
                    <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                    {currentTab.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-slate-900/20 border border-slate-700/50 cursor-pointer"
              >
                {currentTab.primaryActionIcon}
                <span className="hidden sm:inline">{currentTab.primaryActionText}</span>
                <span className="sm:hidden">Action</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Ultra-clean neo-glass dock with prismatic top laser edge. Floats compactly above data tables on mobile.
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
