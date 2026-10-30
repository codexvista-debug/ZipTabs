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
        "style-01": "Style 01 (Architectural Minimal)",
        "style-02": "Style 02 (Executive Slate Chassis)",
        "style-03": "Style 03 (Cockpit Flight Deck)",
        "style-04": "Style 04 (Frosted Glass Dock)",
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
          <span className="font-bold">&quot;Do we even need styling for this element, or does it make it better?&quot;</span>
          <p className="mt-1 text-slate-600 text-xs leading-relaxed">
            Standard web apps often clutter page headers with giant colored hero banners that push valuable table data off-screen.
            Compare below: <strong>Style 01 (Minimalist)</strong> keeps maximum vertical focus for spreadsheets, whereas <strong>Style 03 (Cockpit)</strong> solves a problem by embedding live KPI metrics right into the title row, saving 120px of card space!
          </p>
        </div>
      </div>

      {/* Header Variations Grid */}
      <div className="space-y-6">
        {/* Style 01 */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-01"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                STYLE 01 // ARCHITECTURAL MINIMAL
              </span>
              <span className="text-xs text-slate-500 font-medium">• Elevates Current Clean Look</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#ZERO-CLUTTER</span>
          </div>

          <div className="p-4 sm:p-6 rounded-xl bg-slate-50 border border-slate-200/60 mb-4">
            <div className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                    {currentTab.title}
                  </h2>
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Active View
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 pl-4 hidden sm:block truncate">
                  {currentTab.subtitle}
                </p>
              </div>
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-xs"
              >
                {currentTab.primaryActionIcon}
                <span>{currentTab.primaryActionText}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Ultra-clean and distraction-free. Lets dense table data breathe.
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

        {/* Style 02 */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-02"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                STYLE 02 // EXECUTIVE SLATE CHASSIS
              </span>
              <span className="text-xs text-slate-500 font-medium">• Premium Enterprise Anchor</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#ACTIVE-DEFAULT</span>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/60 mb-4">
            <div className="bg-gradient-to-r from-slate-100/90 via-slate-50/70 to-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 flex flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-xs shrink-0">
                  {currentTab.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                      {currentTab.categoryTag}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                    {currentTab.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                    {currentTab.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-xs"
              >
                {currentTab.primaryActionIcon}
                <span>{currentTab.primaryActionText}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Best balance of clean aesthetics and clear workspace context hierarchy.
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

        {/* Style 03 */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-03"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                STYLE 03 // COCKPIT FLIGHT DECK
              </span>
              <span className="text-xs text-slate-500 font-medium">• Inline Metric Ribbons</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#HIGH-DENSITY</span>
          </div>

          <div className="p-4 sm:p-6 rounded-xl bg-slate-50 border border-slate-200/60 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {currentTab.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {currentTab.kpis.map((kpi, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${kpi.color}`}
                      >
                        <span className="text-[10px] font-medium opacity-80">{kpi.label}:</span>
                        <span>{kpi.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 hidden sm:block">
                  {currentTab.subtitle}
                </p>
              </div>
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-xs"
              >
                {currentTab.primaryActionIcon}
                <span>{currentTab.primaryActionText}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Functional power-user header. Displays crucial KPI signals without extra card widgets.
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

        {/* Style 04 */}
        <div
          className={`rounded-2xl border p-4 sm:p-6 transition-all ${
            liveWorkspaceStyle === "style-04"
              ? "border-blue-500/70 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md"
              : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-100 text-teal-800 uppercase tracking-wider">
                STYLE 04 // FROSTED GLASS DOCK
              </span>
              <span className="text-xs text-slate-500 font-medium">• Modern Translucent Pill</span>
            </div>
            <span className="text-xs font-mono text-slate-400">#NEO-GLASS</span>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/60 mb-4">
            <div className="relative bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs overflow-hidden flex flex-row items-center justify-between gap-3">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 border border-blue-200/80 shadow-2xs flex items-center justify-center shrink-0">
                  {currentTab.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                      {currentTab.title}
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Sync
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                    {currentTab.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-xs"
              >
                {currentTab.primaryActionIcon}
                <span>{currentTab.primaryActionText}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Verdict:</strong> Sophisticated modern tech feel with subtle lighting accents.
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
