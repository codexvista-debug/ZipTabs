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
  Info,
  Lock,
} from "lucide-react";
import { FileBrandIcon } from "@/components/ui/FileBrandIcon";

type VariationId = "vault-island" | "dynamic-notch" | "architectural-chassis";

interface VariationConfig {
  id: VariationId;
  name: string;
  tagline: string;
  isCurrentInDrive?: boolean;
  topDescription: string;
  sidesDescription: string;
  designNotes: string;
}

const VARIATIONS: VariationConfig[] = [
  {
    id: "vault-island",
    name: "Precision Vault (Recommended)",
    tagline: "Top Crown Bar • Side Tactile Grips • Dual Bezel",
    isCurrentInDrive: true,
    topDescription: "Sleek top crown header with technical status indicators, micro-dots, and security registration code.",
    sidesDescription: "Tactile engineered micro-grips inset on left and right flanks + luxury outer chassis bezel ring.",
    designNotes: "Gives the modal physical depth like high-end luxury hardware or an engineered vault door. Balanced, clean, and unmistakable.",
  },
  {
    id: "dynamic-notch",
    name: "Sculpted Dynamic Notch",
    tagline: "Recessed Central Top Island • Vertical Shadow Rails",
    isCurrentInDrive: false,
    topDescription: "Seamlessly inset dark dynamic island notch centered at the top with a live pulsing status beacon.",
    sidesDescription: "Soft-fade charcoal flank rails that taper smoothly into the rounded-3xl bottom geometry.",
    designNotes: "Inspired by modern smartphone dynamic islands and recessed automotive dashboard controls.",
  },
  {
    id: "architectural-chassis",
    name: "Architectural Chassis",
    tagline: "Precision Hash Ruler • Corner Registration Brackets",
    isCurrentInDrive: false,
    topDescription: "Minimalist technical coordinate ruler with micro-hashes and monospace audit tagging.",
    sidesDescription: "Precision 4-corner architectural brackets (⌜ ⌝ ⌞ ⌟) with dual hairline flank borders.",
    designNotes: "Technical blueprint aesthetic inspired by high-end camera bodies and precision measurement instruments.",
  },
];

export function DesignLabView() {
  const [activeLiveModal, setActiveLiveModal] = useState<VariationId | null>(null);

  // Sample file matching user's exact screenshot
  const sampleFile = {
    name: "September_ P2_10312026.xlsx",
    size: "89.9 KB",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    retention: "30d Temp Stash",
    folder: "Root Drive",
  };

  const renderModalByVariation = (variationId: VariationId, isLiveModal = false) => {
    const handleClose = () => {
      if (isLiveModal) setActiveLiveModal(null);
    };

    if (variationId === "vault-island") {
      // Variation 1: Precision Vault (Top Crown + Side Tactile Grips + Bezel Ring)
      return (
        <div
          className={`relative bg-white rounded-3xl shadow-2xl border border-zinc-300/80 ring-1 ring-zinc-950/10 ring-offset-4 ring-offset-zinc-100 w-full overflow-hidden transition-all ${
            isLiveModal ? "max-w-md animate-in fade-in zoom-in-95 duration-200" : "max-w-sm sm:max-w-md"
          }`}
        >
          {/* Creative Top: Sculpted Crown Header with Technical Indicators */}
          <div className="relative pt-2.5 pb-2 px-6 flex items-center justify-between border-b border-zinc-200 bg-gradient-to-b from-zinc-100 to-zinc-50/80">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest pl-1">
                VAULT PURGE // AUTH-LOCK
              </span>
            </div>
            <div className="text-[9px] font-mono text-zinc-400 font-semibold">
              SEC-256
            </div>
          </div>

          {/* Creative Sides: Left & Right Tactile Flank Grips */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pl-1.5 pointer-events-none z-10">
            <span className="w-1 h-3 rounded-full bg-zinc-300" />
            <span className="w-1 h-6 rounded-full bg-zinc-500" />
            <span className="w-1 h-3 rounded-full bg-zinc-300" />
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pr-1.5 pointer-events-none z-10">
            <span className="w-1 h-3 rounded-full bg-zinc-300" />
            <span className="w-1 h-6 rounded-full bg-zinc-500" />
            <span className="w-1 h-3 rounded-full bg-zinc-300" />
          </div>

          {/* Modal Content Body */}
          <div className="p-6 sm:p-7">
            {/* Header Row: Badge & Close Button */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-bold uppercase tracking-wider mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                  <span>Permanent Deletion</span>
                </div>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Delete File from Drive?
                </h3>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spotlight Card (Highlighted feature user loved) */}
            <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-3.5 mb-4 shadow-2xs">
              <div className="shrink-0">
                <FileBrandIcon fileName={sampleFile.name} mimeType={sampleFile.type} size="md" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900 truncate" title={sampleFile.name}>
                  {sampleFile.name}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-zinc-800 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                    {sampleFile.size}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-700 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>{sampleFile.retention}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 bg-white border border-zinc-200 px-1.5 py-0.5 rounded-md shadow-2xs truncate max-w-[120px]">
                    <FolderOpen className="w-3 h-3 shrink-0 text-zinc-400" />
                    <span className="truncate">{sampleFile.folder}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Notice */}
            <div className="p-3.5 rounded-2xl bg-zinc-100/90 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-3 mb-6">
              <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="text-[12px] leading-relaxed text-zinc-600">
                Immediately reclaims <strong className="font-bold text-zinc-950 font-mono">+{sampleFile.size}</strong> of Supabase cloud storage. This file will be permanently purged and cannot be recovered.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Keep File
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-zinc-300" />
                <span>Delete File</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (variationId === "dynamic-notch") {
      // Variation 2: Sculpted Dynamic Notch (Recessed Top Notch + Floating Shadow Rails)
      return (
        <div
          className={`relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 w-full overflow-hidden transition-all ${
            isLiveModal ? "max-w-md animate-in fade-in zoom-in-95 duration-200" : "max-w-sm sm:max-w-md"
          }`}
        >
          {/* Creative Top: Sculpted Dynamic Island Notch */}
          <div className="flex justify-center -mt-px">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>IRREVERSIBLE PURGE</span>
            </div>
          </div>

          {/* Creative Sides: Gradient Shadow Rails on Left & Right Borders */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

          {/* Modal Content Body */}
          <div className="p-6 sm:p-7 pt-5">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Delete File from Drive?
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Action confirmed from authorized Chief workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spotlight Card */}
            <div className="bg-zinc-50/90 border border-zinc-200 rounded-2xl p-4 flex items-center gap-3.5 mb-4">
              <div className="shrink-0">
                <FileBrandIcon fileName={sampleFile.name} mimeType={sampleFile.type} size="md" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900 truncate" title={sampleFile.name}>
                  {sampleFile.name}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-zinc-800 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                    {sampleFile.size}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-700 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>{sampleFile.retention}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 bg-white border border-zinc-200 px-1.5 py-0.5 rounded-md shadow-2xs truncate max-w-[120px]">
                    <FolderOpen className="w-3 h-3 shrink-0 text-zinc-400" />
                    <span className="truncate">{sampleFile.folder}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Notice */}
            <div className="p-3.5 rounded-2xl bg-zinc-100/90 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-3 mb-6">
              <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="text-[12px] leading-relaxed text-zinc-600">
                Immediately reclaims <strong className="font-bold text-zinc-950 font-mono">+{sampleFile.size}</strong> of Supabase cloud storage. This file will be permanently purged and cannot be recovered.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Keep File
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-zinc-300" />
                <span>Delete File</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Variation 3: Architectural Chassis (Precision Hash Ruler + Corner Registration Brackets)
    return (
      <div
        className={`relative bg-white rounded-3xl shadow-2xl border-2 border-zinc-200 w-full overflow-hidden transition-all ${
          isLiveModal ? "max-w-md animate-in fade-in zoom-in-95 duration-200" : "max-w-sm sm:max-w-md"
        }`}
      >
        {/* Creative Top: Precision Hash Ruler Bar */}
        <div className="h-4 w-full bg-zinc-900 flex items-center justify-between px-5 select-none">
          <div className="flex items-center gap-1 text-[8px] font-mono text-zinc-500">
            <span>|||</span>
            <span>||</span>
            <span>|</span>
          </div>
          <span className="text-[8px] font-mono font-bold tracking-widest text-zinc-300 uppercase">
            CHASSIS // SPEC-01 // DESTRUCTIVE
          </span>
          <div className="flex items-center gap-1 text-[8px] font-mono text-zinc-500">
            <span>|</span>
            <span>||</span>
            <span>|||</span>
          </div>
        </div>

        {/* Creative Sides: 4-Corner Architectural Precision Brackets */}
        <div className="absolute top-7 left-3 w-2.5 h-2.5 border-t-2 border-l-2 border-zinc-400 pointer-events-none" />
        <div className="absolute top-7 right-3 w-2.5 h-2.5 border-t-2 border-r-2 border-zinc-400 pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-2.5 h-2.5 border-b-2 border-l-2 border-zinc-400 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-2.5 h-2.5 border-b-2 border-r-2 border-zinc-400 pointer-events-none" />

        {/* Modal Content Body */}
        <div className="p-6 sm:p-7">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-300 text-zinc-900 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                <span>[X] PURGE PERMANENT</span>
              </div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                Delete File from Drive?
              </h3>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Spotlight Card */}
          <div className="bg-zinc-50 border border-zinc-300/80 rounded-2xl p-4 flex items-center gap-3.5 mb-4">
            <div className="shrink-0">
              <FileBrandIcon fileName={sampleFile.name} mimeType={sampleFile.type} size="md" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900 truncate" title={sampleFile.name}>
                {sampleFile.name}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-zinc-800 bg-white border border-zinc-300 px-2 py-0.5 rounded-md shadow-2xs">
                  {sampleFile.size}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-700 bg-white border border-zinc-300 px-2 py-0.5 rounded-md shadow-2xs">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{sampleFile.retention}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 bg-white border border-zinc-300 px-1.5 py-0.5 rounded-md shadow-2xs truncate max-w-[120px]">
                  <FolderOpen className="w-3 h-3 shrink-0 text-zinc-400" />
                  <span className="truncate">{sampleFile.folder}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Storage Notice */}
          <div className="p-3.5 rounded-2xl bg-zinc-100/90 border border-zinc-300/80 text-xs text-zinc-700 flex items-start gap-3 mb-6">
            <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="text-[12px] leading-relaxed text-zinc-600">
              Immediately reclaims <strong className="font-bold text-zinc-950 font-mono">+{sampleFile.size}</strong> of Supabase cloud storage. This file will be permanently purged and cannot be recovered.
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Keep File
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-300" />
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-bold uppercase tracking-wider mb-2 shadow-2xs">
            <FlaskConical className="w-3.5 h-3.5 text-zinc-700" />
            <span>Interactive UI Sandbox & Theme Prototyping</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Design Lab</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Exploring creative top & side styling treatments for the <strong>Obsidian & Chrome (Black, White & Gray)</strong> popup.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-zinc-800" />
            <span>3 Styling Treatments</span>
          </span>
        </div>
      </div>

      {/* Overview Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 border border-zinc-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-zinc-900/20">
            <Sparkles className="w-5 h-5 text-zinc-200" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Active Focus: Polished Top & Side Architecture
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              We preserved the file spotlight card you liked, removed the other color schemes, and engineered 3 creative styling treatments for the <strong>top header</strong> and <strong>side flanks</strong>. Click <strong>"Test Live"</strong> on any card to experience it floating on your screen.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Styling Treatments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {VARIATIONS.map((variation) => (
          <div
            key={variation.id}
            className={`rounded-3xl border p-5 transition-all bg-white flex flex-col justify-between ${
              variation.isCurrentInDrive
                ? "border-zinc-400 ring-2 ring-zinc-900/10 shadow-md"
                : "border-slate-200/90 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      {variation.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {variation.tagline}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveLiveModal(variation.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Test Live</span>
                </button>
              </div>

              {/* Rendered Component Preview in Container */}
              <div className="py-2 flex justify-center">
                {renderModalByVariation(variation.id, false)}
              </div>
            </div>

            {/* Styling Details */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-xs space-y-2">
              <div className="flex items-start gap-1.5 text-slate-600">
                <strong className="text-slate-900 shrink-0">Top:</strong>
                <span>{variation.topDescription}</span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <strong className="text-slate-900 shrink-0">Sides:</strong>
                <span>{variation.sidesDescription}</span>
              </div>
              {variation.isCurrentInDrive && (
                <div className="pt-2 flex items-center gap-1 text-[11px] font-bold text-zinc-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Active on Drive delete modal</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Live Interactive Modal Overlay when Testing a Variation */}
      {activeLiveModal && (() => {
        return createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setActiveLiveModal(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />
            <div className="relative z-10 w-full flex justify-center">
              {renderModalByVariation(activeLiveModal, true)}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
