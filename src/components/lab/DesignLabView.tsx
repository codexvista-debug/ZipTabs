"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Search,
  Command,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Folder,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  DollarSign,
  TrendingUp,
  Smartphone,
  Laptop,
  Sliders,
  Layers,
  Eye,
  Heart,
  Bookmark,
  ChevronRight,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Zap,
  ShieldCheck,
  Play,
  Pause,
  Volume2,
  Calendar,
  Send,
  Mail,
  RefreshCw,
  Plus,
  MoreVertical,
  X,
  User,
  ExternalLink,
  ChevronDown,
  Info,
} from "lucide-react";
import { ExecutiveToast, TOAST_POSITION_CLASSES } from "@/components/ui/ExecutiveToast";

type ConceptSection = "all" | "hud" | "bento" | "invoices" | "mobile" | "drive" | "components";

interface IdeaVote {
  id: string;
  votes: number;
  isBookmarked: boolean;
}

export function DesignLabView() {
  const [activeSection, setActiveSection] = useState<ConceptSection>("all");
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "info" | "warning";
    title: string;
    description: string;
  } | null>(null);

  // Concept 1: HUD & Theme settings state
  const [densityMode, setDensityMode] = useState<"compact" | "cozy" | "executive">("executive");
  const [accentPalette, setAccentPalette] = useState<"blue" | "emerald" | "violet" | "amber">("blue");

  // Concept 2: Audio Player & Bento state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [aiAnalysisDone, setAiAnalysisDone] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Concept 3: Invoice timeline scrubber & live composer
  const [activeAgingBucket, setActiveAgingBucket] = useState<"all" | "1-30" | "31-60" | "60+">("all");
  const [selectedInvoiceConcept, setSelectedInvoiceConcept] = useState({
    vendor: "E-Solutions - Suchetha",
    cleanConsultant: "Suchetha",
    invoiceNum: "34125",
    amount: "$480.00",
    dueDate: "10/03/2026",
    aging: 33,
    isAbnormal: false,
  });

  // Concept 4: Mobile phone simulator state
  const [isMobileOrbOpen, setIsMobileOrbOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<"notes" | "invoices" | "drive">("notes");

  // Concept 5: Drive Peek state
  const [peekFile, setPeekFile] = useState<{
    name: string;
    size: string;
    type: "pdf" | "xlsx" | "image";
    tags: string[];
    date: string;
  } | null>({
    name: "E-Solutions_Remittance_Oct2026.pdf",
    size: "1.4 MB",
    type: "pdf",
    tags: ["QuickBooks", "Paid", "Verified"],
    date: "Oct 28, 2026",
  });

  // Ideas bookmarking & reaction state
  const [ideaVotes, setIdeaVotes] = useState<Record<string, IdeaVote>>({
    "omni-search": { id: "omni-search", votes: 42, isBookmarked: true },
    "bento-notes": { id: "bento-notes", votes: 38, isBookmarked: false },
    "live-zoho-composer": { id: "live-zoho-composer", votes: 56, isBookmarked: true },
    "mobile-orb": { id: "mobile-orb", votes: 29, isBookmarked: false },
    "drive-peek": { id: "drive-peek", votes: 34, isBookmarked: true },
    "tactile-controls": { id: "tactile-controls", votes: 47, isBookmarked: false },
  });

  const toggleVote = (id: string) => {
    setIdeaVotes((prev) => {
      const current = prev[id] || { id, votes: 0, isBookmarked: false };
      const nextVotes = current.votes + 1;
      setToastMessage({
        type: "success",
        title: "Feedback Recorded",
        description: `Voted for ${id.replace("-", " ")} concept!`,
      });
      return { ...prev, [id]: { ...current, votes: nextVotes } };
    });
  };

  const toggleBookmark = (id: string) => {
    setIdeaVotes((prev) => {
      const current = prev[id] || { id, votes: 0, isBookmarked: false };
      const nextStatus = !current.isBookmarked;
      setToastMessage({
        type: "info",
        title: nextStatus ? "Idea Bookmarked" : "Bookmark Removed",
        description: nextStatus ? "Saved to your inspiration board." : "Removed from saved board.",
      });
      return { ...prev, [id]: { ...current, isBookmarked: nextStatus } };
    });
  };

  const handleSimulateAi = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAiAnalysisDone(true);
      setToastMessage({
        type: "success",
        title: "AI Action Extraction Complete",
        description: "Generated 2 automated checklist items from the note.",
      });
    }, 1200);
  };

  const paletteColors = {
    blue: { primary: "bg-blue-600", text: "text-blue-600", border: "border-blue-500", ring: "ring-blue-500" },
    emerald: { primary: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-500", ring: "ring-emerald-500" },
    violet: { primary: "bg-violet-600", text: "text-violet-600", border: "border-violet-500", ring: "ring-violet-500" },
    amber: { primary: "bg-amber-600", text: "text-amber-600", border: "border-amber-500", ring: "ring-amber-500" },
  };

  return (
    <div className="space-y-8 sm:space-y-10 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 animate-in fade-in duration-200">
      {/* Toast Notification for Lab interactions */}
      {toastMessage && (
        <div className={TOAST_POSITION_CLASSES["top-center"]}>
          <ExecutiveToast
            type={toastMessage.type}
            title={toastMessage.title}
            description={toastMessage.description}
            headerMeta="Design Lab Sandbox"
            metric="Concept Live"
            onClose={() => setToastMessage(null)}
            durationMs={3000}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. HERO & LAB MISSION HEADER                              */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-950 to-blue-950 text-white p-6 sm:p-8 md:p-10 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>ZipTabs Innovation & Design Lab</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              Next-Gen UI Concepts & Prototypes
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              Explore interactive experiments for PC, tablet, and mobile. Test spotlight search, bento grids, tactile controls, and live email composition before deciding what to build next.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-lg shadow-black/20 transition-all cursor-pointer active:scale-95"
            >
              <Command className="w-4 h-4 text-blue-600" />
              <span>Open Omni-Search (⌘K)</span>
            </button>
            <a
              href="#mobile-concept"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer active:scale-95"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Mobile Phone Demo</span>
            </a>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-6 mt-6 border-t border-slate-800/80 text-xs font-semibold">
          {[
            { id: "all", label: "✨ All Concepts", count: 6 },
            { id: "hud", label: "⚡ Command HUD & Omni-Search", count: 1 },
            { id: "bento", label: "🍱 Bento Grid & AI Notes", count: 1 },
            { id: "invoices", label: "📊 Invoices Pulse & Zoho Composer", count: 1 },
            { id: "mobile", label: "📱 Mobile Frame Simulator", count: 1 },
            { id: "drive", label: "📁 Drive 2.0 Peek Matrix", count: 1 },
            { id: "components", label: "🎛️ Tactile UI Micro-Controls", count: 1 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as ConceptSection)}
              className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSection === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/50"
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeSection === tab.id ? "bg-white/20 text-white" : "bg-slate-700/60 text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONCEPT 1: COMMAND HUD & OMNI-SEARCH                      */}
      {/* ========================================================= */}
      {(activeSection === "all" || activeSection === "hud") && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Concept 1: Executive Command HUD & Omni-Search
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                A unified top command bar with dynamic health telemetry, global keyboard shortcut (⌘K), and density customization.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleVote("omni-search")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>{ideaVotes["omni-search"]?.votes || 42}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleBookmark("omni-search")}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  ideaVotes["omni-search"]?.isBookmarked
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
                title="Bookmark Idea"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive HUD Mockup */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Dynamic Status Pill */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>373 Invoices Synced</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  <span>5 Need Review</span>
                </div>
              </div>

              {/* Fake Interactive Search Input */}
              <div
                onClick={() => setIsSpotlightOpen(true)}
                className="flex-1 max-w-md bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-400 cursor-pointer shadow-inner transition group"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition" />
                  <span>Jump to invoice, note, vendor, file...</span>
                </div>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-600">
                  ⌘K
                </kbd>
              </div>

              {/* Customizer Controls */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                  {(["compact", "cozy", "executive"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDensityMode(d)}
                      className={`px-2.5 py-1 rounded capitalize font-medium text-[11px] transition cursor-pointer ${
                        densityMode === d ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONCEPT 2: NOTES 2.0 BENTO GRID & AI ACTION HUB           */}
      {/* ========================================================= */}
      {(activeSection === "all" || activeSection === "bento") && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Concept 2: Notes 2.0 — Bento Matrix & AI Action Pill
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Visual hierarchy where high-priority notes take prominence with waveform audio memo player and instant AI action extraction.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleVote("bento-notes")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>{ideaVotes["bento-notes"]?.votes || 38}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleBookmark("bento-notes")}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  ideaVotes["bento-notes"]?.isBookmarked
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
                title="Bookmark Idea"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bento Matrix Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bento Card 1: Featured High-Priority Urgent Note */}
            <div className="md:col-span-2 rounded-2xl bg-linear-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-blue-800/50 flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold uppercase tracking-wider">
                    ⚡ High Priority Note
                  </span>
                  <span className="text-xs text-slate-400">Created 2h ago</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-300">Live Synced</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white">
                  Payroll Confirmation — Remotetiger October Run
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Total gross confirmed across 14 contractors. CCD wire payment request #94112 transmitted successfully. Review attachment before 5 PM wire cutoff.
                </p>
              </div>

              {/* Simulated Audio Memo Waveform Player */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition shadow cursor-pointer active:scale-95"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 flex items-center gap-1 h-6">
                  {[40, 65, 30, 80, 50, 90, 45, 70, 85, 30, 95, 60, 40, 75, 55, 80, 60, 30, 50, 70].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${isPlayingAudio ? Math.max(15, (h + (i % 3) * 15) % 100) : h}%` }}
                      className={`flex-1 rounded-full transition-all duration-150 ${
                        isPlayingAudio ? "bg-blue-400" : "bg-slate-600"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {isPlayingAudio ? "0:14 / 0:42" : "0:42"}
                </span>
              </div>

              {/* AI Action Extraction Bar */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSimulateAi}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  <span>{isAnalyzing ? "Extracting..." : "Simulate AI Action Extract"}</span>
                </button>

                {aiAnalysisDone && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>2 tasks added to ledger</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bento Card 2: Quick Sticky Reminder */}
            <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/60 text-amber-800">
                    Quick Reminder
                  </span>
                  <span className="text-[11px] text-amber-700 font-medium">Due in 3d</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2">
                  USCIS Fee — Sharat Robin Reddy
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Premium processing amount of $2,965 to be deducted from reserve account.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-amber-200/60 flex items-center justify-between text-xs font-mono font-bold text-slate-800">
                <span>Total Due</span>
                <span className="text-amber-700">$2,965.00</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONCEPT 3: INVOICES PULSE & LIVE ZOHO COMPOSER           */}
      {/* ========================================================= */}
      {(activeSection === "all" || activeSection === "invoices") && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Concept 3: Overdue Invoices Pulse & Live Zoho Email Composer
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Select an invoice to watch the Zoho Mail email draft generate in real time on the right, complete with our clean #0070C0 table and warning guard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleVote("live-zoho-composer")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>{ideaVotes["live-zoho-composer"]?.votes || 56}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleBookmark("live-zoho-composer")}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  ideaVotes["live-zoho-composer"]?.isBookmarked
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
                title="Bookmark Idea"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Invoices Selector (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-1">
                <span>Select Invoice to Preview</span>
                <span className="text-blue-600">3 sample rows</span>
              </div>

              {[
                {
                  vendor: "E-Solutions - Suchetha",
                  cleanConsultant: "Suchetha",
                  invoiceNum: "34125",
                  amount: "$480.00",
                  dueDate: "10/03/2026",
                  aging: 33,
                  isAbnormal: false,
                },
                {
                  vendor: "Skill Logic Inc- Mohana Latha Pattapu-2p",
                  cleanConsultant: "Mohana Latha Pattapu-2p",
                  invoiceNum: "23908",
                  amount: "$10,080.00",
                  dueDate: "09/14/2023",
                  aging: 1148,
                  isAbnormal: true,
                },
                {
                  vendor: "Centraprise-Yashwanth Reddy",
                  cleanConsultant: "Yashwanth Reddy",
                  invoiceNum: "31044",
                  amount: "$7,200.00",
                  dueDate: "10/12/2026",
                  aging: 24,
                  isAbnormal: false,
                },
              ].map((inv) => {
                const isSelected = selectedInvoiceConcept.invoiceNum === inv.invoiceNum;
                return (
                  <div
                    key={inv.invoiceNum}
                    onClick={() => setSelectedInvoiceConcept(inv)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-blue-50/90 border-blue-500 shadow-sm ring-1 ring-blue-500/20"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {inv.vendor}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-mono font-semibold">#{inv.invoiceNum}</span>
                          <span>•</span>
                          <span>{inv.aging} days</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-slate-900">
                          {inv.amount}
                        </div>
                        {inv.isAbnormal ? (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Abnormal</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <span>Clean</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Live Zoho Mail Compose Preview (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl bg-slate-900 text-white p-5 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>Zoho Mail Output Preview</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                  <Check className="w-3 h-3" />
                  <span>Pixel-Perfect Calibri 13px</span>
                </div>
              </div>

              {/* Email Envelope Fields */}
              <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                <div>
                  <span className="text-slate-500">To:</span> accounting@{selectedInvoiceConcept.cleanConsultant.toLowerCase().replace(/\s+/g, "")}.com
                </div>
                <div>
                  <span className="text-slate-500">Subject:</span> Overdue Invoice Statement — {selectedInvoiceConcept.cleanConsultant} (Inv #{selectedInvoiceConcept.invoiceNum})
                </div>
              </div>

              {/* Warning Banner if Abnormal */}
              {selectedInvoiceConcept.isAbnormal && (
                <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-600/60 text-amber-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Warning:</strong> Consultant name contains billing tag. Recheck before sending!
                  </span>
                </div>
              )}

              {/* Rendered HTML Table in Mail */}
              <div className="bg-white text-black p-3 rounded-xl overflow-x-auto">
                <table
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    borderCollapse: "collapse",
                    border: "1px solid #000000",
                    fontFamily: "Calibri, Arial, sans-serif",
                    fontSize: "13px",
                    width: "100%",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "left" }}>
                        Consultant
                      </th>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        Invoice
                      </th>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "right" }}>
                        Amount Due
                      </th>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        Due Date
                      </th>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        Aging
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "left" }}>
                        {selectedInvoiceConcept.cleanConsultant}
                      </td>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        {selectedInvoiceConcept.invoiceNum}
                      </td>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "right", fontWeight: "bold" }}>
                        {selectedInvoiceConcept.amount}
                      </td>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        {selectedInvoiceConcept.dueDate}
                      </td>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "center", fontWeight: "bold" }}>
                        {selectedInvoiceConcept.aging}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-slate-400">Pasted from ZipTabs Monolith</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedInvoiceConcept.cleanConsultant);
                    setToastMessage({
                      type: "success",
                      title: "Copied!",
                      description: `Copied "${selectedInvoiceConcept.cleanConsultant}" to clipboard.`,
                    });
                  }}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Test</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONCEPT 4: MOBILE NATIVE PHONE FRAME SIMULATOR            */}
      {/* ========================================================= */}
      <div id="mobile-concept" />
      {(activeSection === "all" || activeSection === "mobile") && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Concept 4: Mobile Native Phone Frame Simulator
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                An actual interactive smartphone canvas showing the Floating Action Orb, swipeable card gestures, and haptic response layout.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleVote("mobile-orb")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>{ideaVotes["mobile-orb"]?.votes || 29}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleBookmark("mobile-orb")}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  ideaVotes["mobile-orb"]?.isBookmarked
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
                title="Bookmark Idea"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex justify-center py-4">
            {/* Realistic iPhone Phone Shell */}
            <div className="w-[320px] sm:w-[350px] h-[640px] rounded-[48px] bg-slate-950 p-3 shadow-2xl ring-12 ring-slate-800 relative flex flex-col justify-between overflow-hidden select-none">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-black z-30 flex items-center justify-between px-2">
                <span className="w-2 h-2 rounded-full bg-blue-500/40" />
                <span className="w-2 h-2 rounded-full bg-amber-500/40" />
              </div>

              {/* Phone Screen Canvas */}
              <div className="flex-1 bg-slate-50 rounded-[38px] overflow-hidden flex flex-col relative pt-7">
                {/* Phone Header */}
                <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="font-black text-slate-900 text-xs tracking-tight">ZipTabs Mobile</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <span>9:41 AM</span>
                  </div>
                </div>

                {/* Simulated Content List */}
                <div className="flex-1 p-3 space-y-2.5 overflow-y-auto no-scrollbar">
                  {/* Card 1 */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Overdue Invoice</span>
                      <span className="text-[10px] font-bold text-rose-600">33d</span>
                    </div>
                    <div className="font-bold text-xs text-slate-900">E-Solutions - Suchetha</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>#34125</span>
                      <span className="font-bold text-slate-900">$480.00</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-600 uppercase">Check Deposit</span>
                      <span className="text-[10px] font-bold text-emerald-600">Cleared</span>
                    </div>
                    <div className="font-bold text-xs text-slate-900">ArtNet - Praneeth CCD Wire</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>#34390</span>
                      <span className="font-bold text-slate-900">$6,200.00</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-violet-600 uppercase">Quick Note</span>
                      <span className="text-[10px] text-slate-400">Today</span>
                    </div>
                    <div className="font-bold text-xs text-slate-900">Add 6k to Jesualdo Reserve</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      USCIS check deduction pending review
                    </div>
                  </div>
                </div>

                {/* Floating Action Orb (FAB) */}
                <div className="absolute bottom-14 right-3 z-20">
                  {isMobileOrbOpen && (
                    <div className="mb-2 space-y-1.5 animate-in slide-in-from-bottom-2 duration-150 flex flex-col items-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileOrbOpen(false);
                          setToastMessage({
                            type: "success",
                            title: "Camera Scanner Opened",
                            description: "Ready to scan receipts and W9s.",
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-bold shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Scan Receipt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileOrbOpen(false);
                          setToastMessage({
                            type: "info",
                            title: "Voice Memo Started",
                            description: "Listening for fast executive notes...",
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Voice Note</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsMobileOrbOpen(!isMobileOrbOpen)}
                    className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-xl shadow-blue-600/40 cursor-pointer active:scale-90 transition-transform"
                  >
                    <Plus className={`w-5 h-5 transition-transform duration-200 ${isMobileOrbOpen ? "rotate-45" : ""}`} />
                  </button>
                </div>

                {/* Phone Bottom Tab Bar */}
                <div className="h-12 bg-white/95 border-t border-slate-200 flex items-center justify-around px-2 z-10 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setMobileActiveTab("notes")}
                    className={`flex flex-col items-center gap-0.5 text-[9px] font-bold cursor-pointer ${
                      mobileActiveTab === "notes" ? "text-blue-600" : "text-slate-400"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Notes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileActiveTab("invoices")}
                    className={`flex flex-col items-center gap-0.5 text-[9px] font-bold cursor-pointer ${
                      mobileActiveTab === "invoices" ? "text-blue-600" : "text-slate-400"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Invoices</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileActiveTab("drive")}
                    className={`flex flex-col items-center gap-0.5 text-[9px] font-bold cursor-pointer ${
                      mobileActiveTab === "drive" ? "text-blue-600" : "text-slate-400"
                    }`}
                  >
                    <Folder className="w-4 h-4" />
                    <span>Drive</span>
                  </button>
                </div>
              </div>

              {/* iPhone Home Indicator Bar */}
              <div className="w-28 h-1 rounded-full bg-slate-700 mx-auto mt-2" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONCEPT 5: DRIVE 2.0 PEEK & STORAGE RING MATRIX           */}
      {/* ========================================================= */}
      {(activeSection === "all" || activeSection === "drive") && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Concept 5: Drive 2.0 — Quick Peek Drawer & Circular Storage Ring
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Visual circular breakdown of Supabase storage plus an instant-peek file drawer that surfaces metadata without loading full preview modals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleVote("drive-peek")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>{ideaVotes["drive-peek"]?.votes || 34}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleBookmark("drive-peek")}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  ideaVotes["drive-peek"]?.isBookmarked
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
                title="Bookmark Idea"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Circular Storage SVG Ring */}
            <div className="md:col-span-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#2563eb" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="75" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="180" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-900">68%</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Used</span>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900">3.4 GB of 5.0 GB</div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 justify-center">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>PDFs (2.1GB)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Images (1.3GB)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Peek Drawer Card */}
            <div className="md:col-span-8 p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">E-Solutions_Remittance_Oct2026.pdf</h4>
                    <p className="text-[11px] text-slate-400">1.4 MB • Uploaded Oct 28, 2026</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AES-256 Encrypted
                </span>
              </div>

              {/* Parsed Telemetry Snippet */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-1.5 font-mono">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Extracted Metadata (Instant OCR)
                </div>
                <div className="text-slate-200">
                  Vendor: E-Solutions Inc | Consultant: Suchetha | Gross: $480.00
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">#QuickBooks</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">#Verified</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setToastMessage({
                      type: "success",
                      title: "Secure URL Generated",
                      description: "One-time download link ready.",
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONCEPT 6: TACTILE UI CONTROLS & MICRO-INTERACTIONS       */}
      {/* ========================================================= */}
      {(activeSection === "all" || activeSection === "components") && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Concept 6: Tactile Design System & Micro-Interactions
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Touch-responsive controls, glowing indicators, and interactive badge tokens designed for precision control.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleVote("tactile-controls")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>{ideaVotes["tactile-controls"]?.votes || 47}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleBookmark("tactile-controls")}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  ideaVotes["tactile-controls"]?.isBookmarked
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
                title="Bookmark Idea"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Micro 1: Status Halos */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-xs font-bold text-slate-700">Breathing Status Halos</div>
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Live indicators for background sync & database locks.</p>
            </div>

            {/* Micro 2: Executive Monolith Button */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-xs font-bold text-slate-700">Magnetic Action Capsule</div>
              <button
                type="button"
                onClick={() => {
                  setToastMessage({
                    type: "success",
                    title: "Capsule Triggered",
                    description: "Haptic feedback simulated.",
                  });
                }}
                className="w-full py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Action Capsule</span>
              </button>
              <p className="text-[11px] text-slate-500">Subtle scale-down on press with high-contrast text.</p>
            </div>

            {/* Micro 3: Color Palette Switcher */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-xs font-bold text-slate-700">Theme Accents</div>
              <div className="flex items-center gap-2">
                {(["blue", "emerald", "violet", "amber"] as const).map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setAccentPalette(color);
                      setToastMessage({
                        type: "info",
                        title: "Palette Swapped",
                        description: `Primary accent changed to ${color}.`,
                      });
                    }}
                    className={`w-7 h-7 rounded-full ${paletteColors[color].primary} transition-transform cursor-pointer ${
                      accentPalette === color ? "scale-125 ring-2 ring-slate-900 ring-offset-2" : "hover:scale-110"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-500">Instant theme customization for executive dashboards.</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SPOTLIGHT OMNI-SEARCH MODAL (⌘K PREVIEW)                  */}
      {/* ========================================================= */}
      {isSpotlightOpen && (
        <div
          onClick={() => setIsSpotlightOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-blue-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={spotlightQuery}
                onChange={(e) => setSpotlightQuery(e.target.value)}
                placeholder="Search invoices, consultants, notes, vault, drive..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-hidden font-medium"
              />
              <button
                type="button"
                onClick={() => setIsSpotlightOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results Categories */}
            <div className="p-3 max-h-80 overflow-y-auto space-y-3 text-xs">
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Overdue Invoices
                </div>
                <div className="space-y-1 mt-1">
                  <div
                    onClick={() => {
                      setIsSpotlightOpen(false);
                      setToastMessage({
                        type: "success",
                        title: "Selected: E-Solutions - Suchetha",
                        description: "Opening in Invoices Ledger...",
                      });
                    }}
                    className="p-2 rounded-xl hover:bg-slate-800 transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-bold text-white">E-Solutions - Suchetha</div>
                        <div className="text-[11px] text-slate-400">Invoice #34125 • 33 days overdue</div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-white">$480.00</span>
                  </div>

                  <div
                    onClick={() => {
                      setIsSpotlightOpen(false);
                      setToastMessage({
                        type: "warning",
                        title: "Warning: Skill Logic Inc",
                        description: "Contains abnormal consultant name tag.",
                      });
                    }}
                    className="p-2 rounded-xl hover:bg-slate-800 transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="font-bold text-white">Skill Logic Inc- Mohana Latha Pattapu-2p</div>
                        <div className="text-[11px] text-slate-400">Invoice #23908 • 1148 days</div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-white">$10,080.00</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Quick Notes
                </div>
                <div className="space-y-1 mt-1">
                  <div
                    onClick={() => {
                      setIsSpotlightOpen(false);
                      setToastMessage({
                        type: "info",
                        title: "Opened Note",
                        description: "Payroll Run - remotetiger",
                      });
                    }}
                    className="p-2 rounded-xl hover:bg-slate-800 transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="font-bold text-white">Payroll Run — remotetiger</div>
                        <div className="text-[11px] text-slate-400">Payment confirmation CCD wire</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">2d ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Shortcut Helper */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Pro Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Esc</kbd> to close</span>
              <span>Navigate with <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">↓</kbd></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
