"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Layers,
  CheckCircle2,
  Play,
  Pause,
  Maximize2,
  Check,
  Smartphone,
  Monitor,
  Flame,
  Zap,
  Activity,
  Terminal,
  Radio,
  FileText,
  RotateCcw,
} from "lucide-react";
import {
  WorkspaceLoadingScreen,
  LoadingScreenVariant,
} from "@/components/ui/WorkspaceLoadingScreen";

interface ConceptMeta {
  id: LoadingScreenVariant;
  number: number;
  name: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  description: string;
  highlights: string[];
}

const CONCEPTS: ConceptMeta[] = [
  {
    id: "bento",
    number: 1,
    name: "HyperDrive Bento",
    tagline: "Cyber Deck / Linear Devtool",
    badge: "RECOMMENDED",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    description:
      "High-speed cyber-minimalist deck with dual counter-rotating gyro rings, a floating kinetic prism, live telemetry bento chips (Database, Security, Latency), and a live progress percentage.",
    highlights: ["Counter-rotating gyro rings", "Real-time telemetry chips", "Segmented cyber progress bar"],
  },
  {
    id: "aurora",
    number: 2,
    name: "Liquid Aurora",
    tagline: "Glassmorphic Luxury / Apple Stripe",
    badge: "LUXURY SAAS",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    description:
      "Deep obsidian background with morphing liquid aurora meshes, frosted glass depth lens with dual-layer floating tabs, an orbiting satellite particle, and ambient soundwave equalizer bars.",
    highlights: ["Liquid morphing mesh blur", "Frosted glass lens depth", "Ambient soundwave equalizer"],
  },
  {
    id: "origami",
    number: 3,
    name: "Origami Tab Cascade",
    tagline: "Brand-Centric Card Shuffle",
    badge: "BRAND IDENTITY",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    description:
      "3D cascading and shuffling physical invoice tabs with glowing lightning notch, live record count, and prompt discount tags. Directly connects with the core identity of ZipTabs.",
    highlights: ["3D document card shuffle loop", "Live 358-record counter", "Prompt discount badge integration"],
  },
  {
    id: "sonar",
    number: 4,
    name: "Quantum Sonar",
    tagline: "Terminal Precision / Devtool",
    badge: "DEVTOOLS",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    description:
      "Concentric expanding radar rings with an interactive terminal telemetry CLI box that prints authentication handshake, database partition, and vendor remittance sync status in real time.",
    highlights: ["Concentric sonar ripples", "Live terminal checklist", "Port & host network telemetry"],
  },
  {
    id: "island",
    number: 5,
    name: "Dynamic Zen Island",
    tagline: "Minimalist Floating Island",
    badge: "SUB-SECOND",
    badgeColor: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20",
    description:
      "Apple Dynamic Island inspired floating pill with dual-arc kinetic spinner, live lightning status badge, and zero visual clutter. Designed for instantaneous perceived boot speeds.",
    highlights: ["Floating Dynamic Island pill", "Dual-arc kinetic spinner", "Ultra-low visual noise"],
  },
  {
    id: "classic",
    number: 6,
    name: "Classic Charcoal",
    tagline: "Previous Architecture",
    badge: "PREVIOUS",
    badgeColor: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    description:
      "The baseline dark charcoal loading screen with central branded squircle and orbital progress ring.",
    highlights: ["Neutral charcoal palette", "Single orbital ring", "Standard status badge"],
  },
];

export function DesignLabView() {
  const [selectedVariant, setSelectedVariant] = useState<LoadingScreenVariant>("bento");
  const [activeAppliedVariant, setActiveAppliedVariant] = useState<LoadingScreenVariant>("bento");
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(42);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [deviceFrame, setDeviceFrame] = useState<"desktop" | "mobile">("desktop");
  const [appliedNotification, setAppliedNotification] = useState(false);

  // Load currently applied style from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ziptabs_loading_style") as LoadingScreenVariant;
      if (saved && ["bento", "aurora", "origami", "sonar", "island", "classic"].includes(saved)) {
        setSelectedVariant(saved);
        setActiveAppliedVariant(saved);
      }
    } catch {}
  }, []);

  // Progress simulation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + 2;
        });
      }, 120);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleApplyAsDefault = (variant: LoadingScreenVariant) => {
    try {
      localStorage.setItem("ziptabs_loading_style", variant);
      setActiveAppliedVariant(variant);
      setAppliedNotification(true);
      setTimeout(() => setAppliedNotification(false), 2500);
    } catch {}
  };

  const activeMeta = CONCEPTS.find((c) => c.id === selectedVariant) || CONCEPTS[0];

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-28 animate-in fade-in duration-200">
      {/* Full Screen Live Preview Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <WorkspaceLoadingScreen
            variant={selectedVariant}
            progress={progress}
            isInteractivePreview={true}
            onExitPreview={() => setIsFullScreen(false)}
          />
        </div>
      )}

      {/* Primary Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wider mb-2 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>DESIGN LAB // EXPERIMENTAL STUDIO</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Loading Screen & Motion Explorations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Test and preview 5 next-generation animated loading screen replacements for ZipTabs. Click any design below to view its live 60fps animations or apply it as your workspace loader.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active: <strong className="text-blue-600 uppercase">{activeAppliedVariant}</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Screen Preview</span>
          </button>
        </div>
      </div>

      {/* Applied Success Toast */}
      {appliedNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Applied <strong>{activeMeta.name}</strong> as your active ZipTabs loading screen! Next time the app loads, this design will appear.
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 uppercase font-mono tracking-wider">SAVED TO STORAGE</span>
        </div>
      )}

      {/* Concept Selector Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CONCEPTS.map((c) => {
          const isSelected = selectedVariant === c.id;
          const isCurrentActive = activeAppliedVariant === c.id;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedVariant(c.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs ${
                isSelected
                  ? "bg-blue-600 text-white shadow-blue-500/20 scale-[1.01]"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                0{c.number}
              </span>
              <span>{c.name}</span>
              {isCurrentActive && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-emerald-300" : "bg-emerald-500"}`} title="Active in app" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stage & Frame */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Stage Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${activeMeta.badgeColor}`}>
              {activeMeta.badge}
            </span>
            <span className="text-xs font-bold text-slate-800">{activeMeta.name}</span>
            <span className="text-xs text-slate-400 hidden md:inline">• {activeMeta.tagline}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Progress Simulation Toggle */}
            <button
              type="button"
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSimulating
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-blue-600" />}
              <span>{isSimulating ? "Pause Progress" : "Simulate 0-100%"}</span>
            </button>

            {/* Reset Progress */}
            <button
              type="button"
              onClick={() => setProgress(42)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Reset progress to 42%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Device Viewport Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setDeviceFrame("desktop")}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  deviceFrame === "desktop" ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Desktop widescreen frame"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceFrame("mobile")}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  deviceFrame === "mobile" ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Mobile smartphone frame"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Set As Default Button */}
            <button
              type="button"
              onClick={() => handleApplyAsDefault(selectedVariant)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeAppliedVariant === selectedVariant
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
              }`}
            >
              {activeAppliedVariant === selectedVariant ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Current App Loader</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Set as App Loader</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Canvas Viewport */}
        <div className="p-3 sm:p-6 bg-slate-100/70 flex items-center justify-center min-h-[440px]">
          <div
            className={`transition-all duration-300 overflow-hidden shadow-2xl rounded-3xl border border-slate-800 ${
              deviceFrame === "mobile"
                ? "w-[340px] h-[580px] max-w-full"
                : "w-full h-[460px] max-w-4xl"
            }`}
          >
            <WorkspaceLoadingScreen
              variant={selectedVariant}
              progress={progress}
              isInteractivePreview={true}
            />
          </div>
        </div>
      </div>

      {/* Design Details & Architectural Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
            <Sparkles className="w-4 h-4" />
            <span>Design Concept Highlights</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {activeMeta.description}
          </p>
          <ul className="pt-2 border-t border-slate-100 space-y-1">
            {activeMeta.highlights.map((h, i) => (
              <li key={i} className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <Activity className="w-4 h-4" />
            <span>Performance & 60 FPS</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Zero external animation bloat. Constructed with hardware-accelerated CSS GPU primitives (<code className="text-slate-800 font-mono text-[11px]">transform</code>, <code className="text-slate-800 font-mono text-[11px]">opacity</code>) and optimized vector paths for instant execution on low-power devices.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Payload: ~3.2 KB</span>
            <span className="text-emerald-600 font-bold">60 FPS Locked</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
            <CheckCircle2 className="w-4 h-4" />
            <span>Persistence & Deployment</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Clicking <strong>&ldquo;Set as App Loader&rdquo;</strong> immediately binds your chosen variant to your browser workspace. When refreshed, ZipTabs uses this exact screen for session boot.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Storage: localStorage</span>
            <span className="text-indigo-600 font-bold">Hot-Swappable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
