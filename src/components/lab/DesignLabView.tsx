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
  Compass,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Eye,
  KeyRound,
  Shield,
  FileCheck,
  Upload,
  FileSpreadsheet,
  NotebookPen,
  LayoutDashboard,
  CalendarDays,
  Plus,
  Filter,
  BarChart3,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { ExecutiveToast, ToastType } from "@/components/ui/ExecutiveToast";

type NotifCategory = "security" | "success" | "warning" | "info";
type ProfessionalStyleId = "chrono-dial" | "instrument-gyro" | "architectural-chassis" | "studio-capsule";

interface NotificationSample {
  category: NotifCategory;
  title: string;
  subtitle: string;
  badge: string;
  metric: string;
  actionText: string;
  headerMeta: string;
}

const NOTIFICATION_PAYLOADS: Record<NotifCategory, NotificationSample> = {
  security: {
    category: "security",
    title: "Unauthorized IP Evicted",
    subtitle: "Vanish Mode rerouted IP 192.168.1.104 to Wikipedia decoy safely.",
    badge: "Security Defense",
    metric: "403 Evicted",
    actionText: "Inspect Network",
    headerMeta: "Chief Security Engine",
  },
  success: {
    category: "success",
    title: "Document Stashed in Vault",
    subtitle: "September_P2.xlsx uploaded and encrypted with AES-256 cloud storage.",
    badge: "Cloud Storage",
    metric: "+89.9 KB Freed",
    actionText: "Open in Drive",
    headerMeta: "Supabase Vault Sync",
  },
  warning: {
    category: "warning",
    title: "Cloud Quota at 85%",
    subtitle: "21.4 MB of 25.0 MB quota consumed. Review 30-day temporary stash.",
    badge: "Storage Quota",
    metric: "3.6 MB Remaining",
    actionText: "Review Files",
    headerMeta: "Drive Resource Alert",
  },
  info: {
    category: "info",
    title: "AI Vision Text Extracted",
    subtitle: "Processed screenshot: 4 invoice lines formatted directly into note.",
    badge: "Neural Vision",
    metric: "99.4% Accuracy",
    actionText: "View Note",
    headerMeta: "OCR Processing Complete",
  },
};

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
  const [activeStudioSection, setActiveStudioSection] = useState<"headers" | "notifications">("headers");
  const [selectedPreviewTab, setSelectedPreviewTab] = useState<HeaderPreviewTab>("invoices");
  const [selectedCategory, setSelectedCategory] = useState<NotifCategory>("security");
  const [activeLiveToast, setActiveLiveToast] = useState<{
    styleId: ProfessionalStyleId;
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

  const triggerToast = (styleId: ProfessionalStyleId) => {
    setActiveLiveToast({ styleId, category: selectedCategory });
  };

  // Helper to render live floating toast in a portal
  const renderLiveToast = () => {
    if (!isMounted || !activeLiveToast || typeof document === "undefined") return null;

    return createPortal(
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[calc(100vw-24px)] sm:max-w-lg flex justify-center animate-in fade-in slide-in-from-top-6 duration-300 pointer-events-auto">
        {renderNotificationCard(activeLiveToast.styleId, activeLiveToast.category, true)}
      </div>,
      document.body
    );
  };

  // Render the specific notification style
  const renderNotificationCard = (
    styleId: ProfessionalStyleId,
    category: NotifCategory,
    isLive = false
  ) => {
    const data = NOTIFICATION_PAYLOADS[category];
    const handleClose = () => {
      if (isLive) setActiveLiveToast(null);
    };

    if (styleId === "chrono-dial") {
      return (
        <div
          className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-zinc-200/90 overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-2xl shadow-zinc-950/15 max-w-lg ring-1 ring-zinc-900/10" : "w-full"
          }`}
        >
          <div className="p-4 sm:p-5 flex items-center gap-4">
            <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
              <svg
                className="absolute inset-0 w-full h-full animate-[spin_8s_linear_infinite]"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#e4e4e7"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="4 6"
                />
              </svg>
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                  {data.badge}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">Just now</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-900 truncate tracking-tight">
                {data.title}
              </h4>
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {data.subtitle}
              </p>
            </div>

            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            >
              <span>{data.actionText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {isLive && (
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }

    if (styleId === "instrument-gyro") {
      return (
        <div
          className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-zinc-200/90 overflow-hidden transition-all duration-300 ${
            isLive ? "shadow-2xl shadow-zinc-950/15 max-w-lg ring-1 ring-zinc-900/10" : "w-full"
          }`}
        >
          <div className="p-4 sm:p-5 flex items-center gap-4">
            <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-emerald-200/80" />
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-300 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {data.badge}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">{data.metric}</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-900 truncate tracking-tight">
                {data.title}
              </h4>
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {data.subtitle}
              </p>
            </div>

            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 hover:border-zinc-900 text-zinc-800 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <span>{data.actionText}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {isLive && (
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }

    if (styleId === "architectural-chassis") {
      const toastType: ToastType = category === "security" ? "error" : (category as ToastType);
      return (
        <ExecutiveToast
          type={toastType}
          title={data.title}
          description={data.subtitle}
          headerMeta={data.headerMeta}
          metric={data.metric}
          action={{
            label: data.actionText,
            onClick: () => {},
          }}
          onClose={handleClose}
        />
      );
    }

    // Studio Solid-State Capsule
    return (
      <div
        className={`relative bg-zinc-900 text-white rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden transition-all duration-300 ${
          isLive ? "shadow-2xl shadow-black/40 max-w-lg ring-1 ring-white/10" : "w-full"
        }`}
      >
        <div className="p-4 sm:p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white shrink-0 shadow-inner">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                {data.badge}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">{data.metric}</span>
            </div>
            <h4 className="text-sm font-bold text-white truncate tracking-tight">
              {data.title}
            </h4>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {data.subtitle}
            </p>
          </div>

          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            <span>{data.actionText}</span>
          </button>

          {isLive && (
            <button
              type="button"
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const headerSample = TAB_HEADER_DATA[selectedPreviewTab];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200 font-sans">
      {/* Live Portal Floater */}
      {renderLiveToast()}

      {/* Primary Section Switcher */}
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
            Evaluate header architectures and notification styling variations before applying them across the project.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveStudioSection("headers")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeStudioSection === "headers"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tab Main Headers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStudioSection("notifications")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeStudioSection === "notifications"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications (Live)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB MAIN HEADER EXPLORATIONS MODULE */}
      {/* ========================================================================= */}
      {activeStudioSection === "headers" && (
        <div className="space-y-8 animate-in fade-in duration-200">
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
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20"
                        : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Design Question & Expert Verdict Box */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/70 p-4 sm:p-5 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>"Do we even need styling for this element, or does it make it better?"</span>
              </div>
              <p className="text-slate-600 text-xs max-w-3xl leading-relaxed">
                <strong>Our UX Analysis:</strong> Standard web apps often clutter page headers with giant colored hero banners that push valuable table data off-screen.
                Compare below: <strong>Style 01 (Minimalist)</strong> keeps maximum vertical focus for spreadsheets, whereas <strong>Style 03 (Cockpit)</strong> actually solves a problem by embedding live KPI metrics right into the title row, saving 120px of card space!
              </p>
            </div>
          </div>

          {/* 4 Header Architectural Variations */}
          <div className="space-y-6">
            {/* VARIATION 1: Modern Architectural Minimal (Current Style Elevated) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    STYLE 01 // ARCHITECTURAL MINIMAL
                  </span>
                  <span className="text-xs font-bold text-slate-400">• Elevates Current Clean Look</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">#ZERO-CLUTTER</span>
              </div>

              {/* Live Header Render */}
              <div className="py-2">
                <div className="flex flex-row items-center justify-between gap-3 pb-4 border-b border-slate-200/70">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {headerSample.title}
                      </h2>
                      <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Active View
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 pl-4">
                      {headerSample.subtitle}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-98 transition-all shrink-0 cursor-pointer"
                  >
                    {headerSample.primaryActionIcon}
                    <span>{headerSample.primaryActionText}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <span><strong>Verdict:</strong> Ultra-clean, zero visual noise, gives 100% of the screen height to the table and content.</span>
                <span className="font-semibold text-emerald-700">Recommended for spreadsheet & data heavy views</span>
              </div>
            </div>

            {/* VARIATION 2: Executive Slate Chassis (Subtle Tinted Banner) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    STYLE 02 // EXECUTIVE SLATE CHASSIS
                  </span>
                  <span className="text-xs font-bold text-slate-400">• Framed Page Anchor</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">#SLATE-CHASSIS</span>
              </div>

              {/* Live Header Render */}
              <div className="py-2">
                <div className="bg-gradient-to-r from-slate-100/90 via-slate-50/70 to-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-sm shrink-0">
                      {headerSample.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                          {headerSample.categoryTag}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {headerSample.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {headerSample.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md shadow-slate-900/15 active:scale-98 transition-all cursor-pointer"
                    >
                      {headerSample.primaryActionIcon}
                      <span>{headerSample.primaryActionText}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <span><strong>Verdict:</strong> Clearly defines the top of each tab with executive corporate presence.</span>
                <span className="font-semibold text-slate-700">Best if you want each tab to feel distinct</span>
              </div>
            </div>

            {/* VARIATION 3: Cockpit Flight Deck (Inline Metric Ribbons) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    STYLE 03 // COCKPIT FLIGHT DECK
                  </span>
                  <span className="text-xs font-bold text-slate-400">• High-Density Inset KPIs</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">#FLIGHT-DECK</span>
              </div>

              {/* Live Header Render */}
              <div className="py-2">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/70">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {headerSample.title}
                      </h2>

                      {/* Embedded KPI Ribbon */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {headerSample.kpis.map((kpi, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${kpi.color} shadow-2xs`}
                          >
                            <span className="text-[10px] font-medium opacity-80">{kpi.label}:</span>
                            <span>{kpi.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      {headerSample.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-98 transition-all cursor-pointer"
                    >
                      {headerSample.primaryActionIcon}
                      <span>{headerSample.primaryActionText}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <span><strong>Verdict:</strong> Highest value! Embeds critical numbers directly into the header so separate bulky metric cards aren&apos;t required.</span>
                <span className="font-semibold text-blue-700">Saves up to 140px of vertical space</span>
              </div>
            </div>

            {/* VARIATION 4: Frosted Glass Floating Dock (Modern Apple Pro / Linear Capsule) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    STYLE 04 // FROSTED GLASS DOCK
                  </span>
                  <span className="text-xs font-bold text-slate-400">• Luxury Modern Tactile</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">#GLASS-DOCK</span>
              </div>

              {/* Live Header Render */}
              <div className="py-2">
                <div className="relative bg-slate-50/80 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Razor Top Gradient Accent Rail */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent" />

                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                      {headerSample.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">
                          {headerSample.title}
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Sync
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {headerSample.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                    >
                      Filter
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
                    >
                      {headerSample.primaryActionIcon}
                      <span>{headerSample.primaryActionText}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <span><strong>Verdict:</strong> Ultra-premium modern SaaS dock. Adds tactile micro-depth without feeling heavy.</span>
                <span className="font-semibold text-sky-700">Best for modern Apple-like executive feel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NOTIFICATIONS STUDIO MODULE (PRESERVED) */}
      {/* ========================================================================= */}
      {activeStudioSection === "notifications" && (
        <div className="space-y-8 animate-in fade-in duration-200">
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

          {/* Grid of 4 Refined Professional Concepts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Concept 1: Executive Chrono-Ring */}
            <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                      REFINED 01 // SWISS CHRONO
                    </span>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Executive Chrono-Ring
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Refined Swiss watchmaker dial: smooth continuous circular SVG progress halo, centered icon core, clean category badge, and luxury rounded-xl action button.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerToast("chrono-dial")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Test Live</span>
                  </button>
                </div>

                <div className="pt-2">
                  {renderNotificationCard("chrono-dial", selectedCategory, false)}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Smooth SVG Ring • Executive Typography • Luxury Finish</span>
                <span className="font-mono text-zinc-400">#CHRONO-PRO</span>
              </div>
            </div>

            {/* Concept 2: Precision Instrument Gyro */}
            <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                      REFINED 02 // DUAL-ORBIT INSTRUMENT
                    </span>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Precision Instrument Gyro
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Minimalist instrument gauge: dual-orbit ring with a smooth tracking satellite dot, subtle vertical flank border, and a tactile outline chevron button.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerToast("instrument-gyro")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Test Live</span>
                  </button>
                </div>

                <div className="pt-2">
                  {renderNotificationCard("instrument-gyro", selectedCategory, false)}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Orbiting Satellite • Flank Accent • Tactile Outline Action</span>
                <span className="font-mono text-zinc-400">#GYRO-INST</span>
              </div>
            </div>

            {/* Concept 3: Architectural Executive Chassis */}
            <div className="bg-zinc-50/80 rounded-3xl border-2 border-emerald-500/50 p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm relative">
              <div className="absolute -top-3 right-6 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Selected Standard</span>
              </div>

              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-widest">
                      REFINED 03 // EXECUTIVE CHASSIS
                    </span>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Architectural Executive Chassis
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Refined hardware cartridge: sleek corporate top header bar with live workspace context, recessed tactile icon well with breathing pulse, and executive button.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerToast("architectural-chassis")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Test Live</span>
                  </button>
                </div>

                <div className="pt-2">
                  {renderNotificationCard("architectural-chassis", selectedCategory, false)}
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-200/80 flex items-center justify-between text-[11px] text-zinc-600 font-medium">
                <span className="text-emerald-700 font-bold">Standardized across Drive, Notes, Usage, Master Control & Invoices</span>
                <span className="font-mono text-zinc-400">#CHASSIS-CORP</span>
              </div>
            </div>

            {/* Concept 4: Studio Solid-State Capsule */}
            <div className="bg-zinc-50/80 rounded-3xl border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all shadow-xs">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                      REFINED 04 // SOLID-STATE STUDIO
                    </span>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Studio Solid-State Capsule
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Apple Pro inspired solid-state look: high-contrast dark tile with an animated micro-LED corner beacon, clean typography, and a tactile light pill button.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerToast("studio-capsule")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Test Live</span>
                  </button>
                </div>

                <div className="pt-2">
                  {renderNotificationCard("studio-capsule", selectedCategory, false)}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Dark Tile Anchor • Corner Beacon • Clean Pill Action</span>
                <span className="font-mono text-zinc-400">#SOLID-STATE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
