"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  FlaskConical,
  Sparkles,
  Eye,
  Trash2,
  HardDrive,
  X,
  FolderOpen,
  Shield,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
} from "lucide-react";
import { FileBrandIcon } from "@/components/ui/FileBrandIcon";

type SchemeId = "monochrome" | "cobalt" | "crimson" | "amber";

interface SchemeConfig {
  id: SchemeId;
  name: string;
  tagline: string;
  badgeLabel: string;
  isCurrentInDrive?: boolean;
  colors: {
    accentBar: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    badgeDot: string;
    cardBorder: string;
    spotlightBg: string;
    spotlightBorder: string;
    metaPillBg: string;
    metaPillBorder: string;
    metaPillText: string;
    reclaimBoxBg: string;
    reclaimBoxBorder: string;
    reclaimIconBg: string;
    reclaimIconText: string;
    reclaimValueColor: string;
    cancelBtn: string;
    deleteBtn: string;
  };
  notes: string;
}

const SCHEMES: SchemeConfig[] = [
  {
    id: "monochrome",
    name: "Obsidian & Chrome",
    tagline: "Black, White & Charcoal Gray",
    badgeLabel: "Permanent Deletion",
    isCurrentInDrive: true,
    colors: {
      accentBar: "bg-gradient-to-r from-zinc-950 via-zinc-700 to-zinc-400",
      badgeBg: "bg-zinc-100",
      badgeText: "text-zinc-800",
      badgeBorder: "border-zinc-200",
      badgeDot: "bg-zinc-900",
      cardBorder: "border-zinc-200/90",
      spotlightBg: "bg-zinc-50",
      spotlightBorder: "border-zinc-200/90",
      metaPillBg: "bg-white",
      metaPillBorder: "border-zinc-200",
      metaPillText: "text-zinc-700",
      reclaimBoxBg: "bg-zinc-100/90",
      reclaimBoxBorder: "border-zinc-200",
      reclaimIconBg: "bg-zinc-900",
      reclaimIconText: "text-white",
      reclaimValueColor: "text-zinc-950 font-black",
      cancelBtn: "border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700",
      deleteBtn: "bg-zinc-900 hover:bg-black text-white shadow-zinc-900/20",
    },
    notes: "Currently active on Drive. Clean architectural monochrome aesthetic with zero color noise, focusing attention entirely on file metadata.",
  },
  {
    id: "cobalt",
    name: "Titanium & Cobalt",
    tagline: "High-Tech Corporate Navy & Steel",
    badgeLabel: "Permanent Purge",
    colors: {
      accentBar: "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400",
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-700",
      badgeBorder: "border-blue-200",
      badgeDot: "bg-blue-600",
      cardBorder: "border-slate-200/90",
      spotlightBg: "bg-slate-50/80",
      spotlightBorder: "border-slate-200",
      metaPillBg: "bg-white",
      metaPillBorder: "border-slate-200",
      metaPillText: "text-slate-700",
      reclaimBoxBg: "bg-blue-50/50",
      reclaimBoxBorder: "border-blue-100",
      reclaimIconBg: "bg-blue-600",
      reclaimIconText: "text-white",
      reclaimValueColor: "text-blue-700 font-black",
      cancelBtn: "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
      deleteBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25",
    },
    notes: "Clean corporate feel matching ZipTabs's primary brand theme. High credibility with subtle cobalt blue badges and dark blue primary action.",
  },
  {
    id: "crimson",
    name: "Crimson Obsidian",
    tagline: "High-Contrast Destructive Alert",
    badgeLabel: "Permanent Deletion",
    colors: {
      accentBar: "bg-gradient-to-r from-red-600 via-rose-500 to-amber-500",
      badgeBg: "bg-red-50",
      badgeText: "text-red-700",
      badgeBorder: "border-red-200",
      badgeDot: "bg-red-600 animate-pulse",
      cardBorder: "border-slate-200/90",
      spotlightBg: "bg-slate-50",
      spotlightBorder: "border-slate-200",
      metaPillBg: "bg-white",
      metaPillBorder: "border-slate-200",
      metaPillText: "text-slate-700",
      reclaimBoxBg: "bg-red-50/60",
      reclaimBoxBorder: "border-red-100",
      reclaimIconBg: "bg-red-600",
      reclaimIconText: "text-white",
      reclaimValueColor: "text-red-700 font-black",
      cancelBtn: "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
      deleteBtn: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/25",
    },
    notes: "Bold, unmissable destructive scheme. Provides maximum clarity that deleting a file is permanent and irreversible, preventing accidental clicks.",
  },
  {
    id: "amber",
    name: "Amber Caution & Charcoal",
    tagline: "Safety-First Warning Palette",
    badgeLabel: "Irreversible Purge",
    colors: {
      accentBar: "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-800",
      badgeBorder: "border-amber-200",
      badgeDot: "bg-amber-500 animate-pulse",
      cardBorder: "border-slate-200/90",
      spotlightBg: "bg-amber-50/20",
      spotlightBorder: "border-amber-200/60",
      metaPillBg: "bg-white",
      metaPillBorder: "border-slate-200",
      metaPillText: "text-slate-700",
      reclaimBoxBg: "bg-amber-50/70",
      reclaimBoxBorder: "border-amber-200",
      reclaimIconBg: "bg-amber-600",
      reclaimIconText: "text-white",
      reclaimValueColor: "text-amber-800 font-black",
      cancelBtn: "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
      deleteBtn: "bg-slate-900 hover:bg-black text-white shadow-slate-900/20",
    },
    notes: "Warm warning aesthetic inspired by financial and cloud vault safeguards. Uses amber caution cues with dark charcoal action buttons.",
  },
];

export function DesignLabView() {
  const [activeLiveModal, setActiveLiveModal] = useState<SchemeId | null>(null);

  // Sample file data for previews matching user's exact screenshot
  const sampleFile = {
    name: "September_ P2_10312026.xlsx",
    size: "89.9 KB",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    retention: "30d Temp Stash",
    folder: "Root Drive",
  };

  const renderModalPreview = (scheme: SchemeConfig, isLiveModal = false) => {
    const c = scheme.colors;

    return (
      <div
        className={`bg-white rounded-3xl shadow-2xl border ${c.cardBorder} w-full overflow-hidden transition-all ${
          isLiveModal ? "max-w-md animate-in fade-in zoom-in-95 duration-200" : "max-w-sm sm:max-w-md"
        }`}
      >
        {/* Top Accent Gradient Bar */}
        <div className={`h-1.5 w-full ${c.accentBar}`} />

        <div className="p-6">
          {/* Header Row: Badge & Close Button */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${c.badgeBg} border ${c.badgeBorder} ${c.badgeText} text-[10px] font-bold uppercase tracking-wider mb-2`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${c.badgeDot}`} />
                <span>{scheme.badgeLabel}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Delete File from Drive?
              </h3>
            </div>

            <button
              type="button"
              onClick={() => isLiveModal && setActiveLiveModal(null)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* File Spotlight Preview Card (The element the user loved & circled) */}
          <div className={`${c.spotlightBg} border ${c.spotlightBorder} rounded-2xl p-4 flex items-center gap-3.5 mb-4`}>
            <div className="shrink-0">
              <FileBrandIcon fileName={sampleFile.name} mimeType={sampleFile.type} size="md" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate" title={sampleFile.name}>
                {sampleFile.name}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold ${c.metaPillText} ${c.metaPillBg} border ${c.metaPillBorder} px-2 py-0.5 rounded-md shadow-2xs`}
                >
                  {sampleFile.size}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold ${c.metaPillText} ${c.metaPillBg} border ${c.metaPillBorder} px-2 py-0.5 rounded-md shadow-2xs`}
                >
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>{sampleFile.retention}</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium ${c.metaPillText} ${c.metaPillBg} border ${c.metaPillBorder} px-1.5 py-0.5 rounded-md shadow-2xs truncate max-w-[120px]`}
                >
                  <FolderOpen className="w-3 h-3 shrink-0 text-slate-400" />
                  <span className="truncate">{sampleFile.folder}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Storage Reclaimed Callout Banner */}
          <div className={`p-3.5 rounded-2xl ${c.reclaimBoxBg} border ${c.reclaimBoxBorder} text-xs text-slate-700 flex items-start gap-3 mb-6`}>
            <div
              className={`w-7 h-7 rounded-xl ${c.reclaimIconBg} ${c.reclaimIconText} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
            >
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="text-[12px] leading-relaxed text-slate-600">
              Immediately reclaims{" "}
              <strong className={`font-mono ${c.reclaimValueColor}`}>+{sampleFile.size}</strong> of Supabase cloud storage. This file will be permanently purged and cannot be recovered.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => isLiveModal && setActiveLiveModal(null)}
              className={`px-4 py-2.5 rounded-xl border ${c.cancelBtn} text-xs font-bold transition-colors cursor-pointer`}
            >
              Keep File
            </button>
            <button
              type="button"
              onClick={() => isLiveModal && setActiveLiveModal(null)}
              className={`px-4 py-2.5 rounded-xl ${c.deleteBtn} text-xs font-bold shadow-md active:scale-98 transition-all cursor-pointer flex items-center gap-1.5`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete File</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/70">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2 shadow-2xs">
            <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
            <span>Interactive UI Sandbox & Theme Prototyping</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Design Lab</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Test and preview component variations, interactive dialogs, and color palettes in real-time before rolling them out across the workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>4 Color Schemes Ready</span>
          </span>
        </div>
      </div>

      {/* Overview Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Active Experiment: Delete Confirmation Popup Color Schemes
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Compare 4 curated light-mode color schemes for the delete confirmation popup. Click <strong>"Test Live Modal"</strong> on any scheme to experience the full pop-up with backdrop blur.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Color Schemes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {SCHEMES.map((scheme) => (
          <div
            key={scheme.id}
            className={`rounded-3xl border p-5 sm:p-6 transition-all bg-slate-50/50 flex flex-col justify-between ${
              scheme.isCurrentInDrive
                ? "border-zinc-300 ring-2 ring-zinc-900/10 shadow-sm"
                : "border-slate-200/90 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div>
              {/* Scheme Card Header */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      {scheme.name}
                    </h3>
                    {scheme.isCurrentInDrive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-900 text-white">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Active on Drive</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {scheme.tagline}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveLiveModal(scheme.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs transition-all cursor-pointer hover:border-slate-300 active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>Test Live Modal</span>
                </button>
              </div>

              {/* Rendered Component Preview in Container */}
              <div className="py-2 flex justify-center">
                {renderModalPreview(scheme, false)}
              </div>
            </div>

            {/* Scheme Design Notes */}
            <div className="mt-5 pt-4 border-t border-slate-200/70 text-xs text-slate-600 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{scheme.notes}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live Interactive Modal Overlay when Testing a Scheme */}
      {activeLiveModal && (() => {
        const activeScheme = SCHEMES.find((s) => s.id === activeLiveModal);
        if (!activeScheme) return null;

        return createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setActiveLiveModal(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />
            <div className="relative z-10 w-full flex justify-center">
              {renderModalPreview(activeScheme, true)}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
