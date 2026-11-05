"use client";

import React, { useState } from "react";
import {
  Phone,
  PhoneCall,
  PhoneForwarded,
  Mail,
  Building2,
  Copy,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  ArrowRight,
  Hash,
  ExternalLink,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { ExecutiveToast, TOAST_POSITION_CLASSES } from "@/components/ui/ExecutiveToast";

type DesignOption = "option-1" | "option-2" | "option-3" | "option-4" | "option-5" | "current";

export function DesignLabView() {
  const [selectedDesign, setSelectedDesign] = useState<DesignOption>("option-2");
  const [testExtension, setTestExtension] = useState("5540");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  // Mock contact matching user's exact screenshot
  const contact = {
    id: "rec_pawan_rathore",
    name: "Pawan Rathore",
    company: "Q1 Technologies",
    division: "Vendor",
    phone: "1 (630) 937-0240",
    extension: testExtension,
    email: "pawan.rathore@q1tech.com",
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2500);
  };

  // Helper to render extension according to each design option
  const renderExtensionBadge = (design: DesignOption) => {
    if (!contact.extension) return null;
    const cleanExt = contact.extension.replace(/^(ext|x|ext\.|ext:)\s*/i, "");

    switch (design) {
      // -------------------------------------------------------------
      // CURRENT DESIGN (Before - awkward superscript & icon)
      // -------------------------------------------------------------
      case "current":
        return (
          <sup
            title={`Extension: ${contact.extension}`}
            className="text-[8.5px] sm:text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50/90 border border-indigo-200/80 px-1 py-0.5 rounded leading-none shadow-2xs select-all tracking-tight -top-1 shrink-0 inline-flex items-center gap-0.5"
          >
            <PhoneForwarded className="w-2.5 h-2.5 text-indigo-500" />
            <span>{cleanExt}</span>
          </sup>
        );

      // -------------------------------------------------------------
      // OPTION 1: Clean Inline Monospace Suffix (Natural Baseline)
      // No box, no superscript, perfectly aligned with font baseline
      // -------------------------------------------------------------
      case "option-1":
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-500 shrink-0 select-all">
            <span className="text-slate-300 font-normal">•</span>
            <span className="text-indigo-600 font-bold">ext. {cleanExt}</span>
          </span>
        );

      // -------------------------------------------------------------
      // OPTION 2: Perfectly Centered Rounded Pill (RECOMMENDED)
      // Vertical items-center, no <sup>, clear "ext" label, crisp padding
      // -------------------------------------------------------------
      case "option-2":
        return (
          <span
            title={`Extension: ${cleanExt} (Click to copy extension only)`}
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(cleanExt, `Copied extension: ${cleanExt}`);
            }}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/90 hover:bg-indigo-100/80 transition-colors shadow-2xs shrink-0 select-all cursor-pointer align-middle"
          >
            <span className="text-indigo-400 font-medium text-[9px]">ext</span>
            <span>{cleanExt}</span>
          </span>
        );

      // -------------------------------------------------------------
      // OPTION 3: Segmented Number & Extension Bar
      // Unified aesthetic with vertical divider
      // -------------------------------------------------------------
      case "option-3":
        return (
          <span className="inline-flex items-center shrink-0">
            <span className="h-3 w-px bg-slate-300 mx-1.5" />
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 text-[10.5px] font-mono font-bold border border-slate-200">
              <span className="text-slate-400 font-normal text-[9.5px]">x</span>
              <span>{cleanExt}</span>
            </span>
          </span>
        );

      // -------------------------------------------------------------
      // OPTION 4: Modern Micro-Badge with Hash Icon
      // Compact, sleek, perfectly centered
      // -------------------------------------------------------------
      case "option-4":
        return (
          <span
            title={`Extension: ${cleanExt}`}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200/80 text-[10px] font-mono font-bold shrink-0 shadow-2xs select-all align-middle"
          >
            <Hash className="w-2.5 h-2.5 text-violet-500 stroke-[2.5]" />
            <span>{cleanExt}</span>
          </span>
        );

      // -------------------------------------------------------------
      // OPTION 5: High-Contrast Two-Tone Tag
      // Executive badge with dark label and bright number
      // -------------------------------------------------------------
      case "option-5":
        return (
          <span
            title={`Extension: ${cleanExt}`}
            className="inline-flex items-center rounded overflow-hidden border border-indigo-200 text-[9.5px] font-mono shrink-0 shadow-2xs select-all align-middle"
          >
            <span className="bg-indigo-600 text-white font-extrabold px-1 py-0.2 tracking-wider text-[8.5px]">
              EXT
            </span>
            <span className="bg-indigo-50/90 text-indigo-900 font-bold px-1.5 py-0.2">
              {cleanExt}
            </span>
          </span>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {copiedLabel && (
        <div className={TOAST_POSITION_CLASSES["top-center"]}>
          <ExecutiveToast
            type="success"
            title="Copied to Clipboard"
            description={copiedLabel}
            headerMeta="Directory Extension Sandbox"
            metric="Copied"
            onClose={() => setCopiedLabel(null)}
            durationMs={2500}
          />
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Phone Extension Alignment & Design Lab
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Explore better alignments and modern visual treatments for phone extensions in Directory cards and tables. Compare the current awkward superscript vs. 5 refined, perfectly centered designs.
        </p>

        {/* Extension Test Value Selector */}
        <div className="flex flex-wrap items-center gap-2 pt-4 mt-2 text-xs">
          <span className="font-bold text-slate-500">Test Extension Value:</span>
          {["5540", "x102", "88219", "ext 4"].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setTestExtension(val)}
              className={`px-2.5 py-1 rounded-lg font-mono font-bold transition cursor-pointer ${
                testExtension === val
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Design Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { id: "option-2", title: "Option 2 (Rec.)", desc: "Centered Pill" },
          { id: "option-1", title: "Option 1", desc: "Clean Suffix" },
          { id: "option-3", title: "Option 3", desc: "Segmented Bar" },
          { id: "option-4", title: "Option 4", desc: "Hash # Badge" },
          { id: "option-5", title: "Option 5", desc: "Two-Tone Tag" },
          { id: "current", title: "Current (Before)", desc: "Superscript" },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedDesign(opt.id as DesignOption)}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedDesign === opt.id
                ? "bg-blue-50/90 border-blue-600 shadow-sm ring-2 ring-blue-600/20"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <div className="text-xs font-black text-slate-900">{opt.title}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* LIVE INTERACTIVE DIRECTORY CARD PREVIEW                                  */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-bold text-slate-900">Directory Card Preview</span>
            <span className="text-slate-400 font-mono text-[11px]">
              (Currently testing: <strong className="text-blue-600">{selectedDesign}</strong>)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">Live Interactive Mock</span>
        </div>

        {/* Directory Card matching user screenshot */}
        <div className="max-w-md mx-auto p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-md space-y-3.5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                PR
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-sm tracking-tight">{contact.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {contact.division}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.company}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button type="button" className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Phone Row */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
            {/* Left: Phone Icon + Number + Extension */}
            <div className="flex items-center gap-2 font-mono text-xs text-slate-800 min-w-0 flex-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="font-semibold select-all text-slate-900">{contact.phone}</span>
                {renderExtensionBadge(selectedDesign)}
              </div>
            </div>

            {/* Right: Call Button + Copy Button */}
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={`tel:${contact.phone.replace(/[^\d+]/g, "")},${contact.extension}`}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-all"
                title={`Call ${contact.phone}${contact.extension ? ` ext. ${contact.extension}` : ""}`}
              >
                <Phone className="w-3 h-3" />
                <span>Call</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopy(`${contact.phone} ext ${contact.extension}`, "Full phone and extension copied")}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Copy Phone and Extension"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Email Row */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-700 min-w-0 flex-1">
              <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate select-all">{contact.email}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(contact.email, "Email copied")}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
              title="Copy Email"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SIDE-BY-SIDE ALL DESIGNS COMPARISON                                       */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              All 6 Designs Side-by-Side Comparison
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare how the phone row looks across every design option directly.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              id: "option-2" as DesignOption,
              name: "Option 2 (Recommended): Centered Rounded Pill",
              description: "Vertically centered on the font line, smooth pill with light indigo contrast, click-to-copy.",
            },
            {
              id: "option-1" as DesignOption,
              name: "Option 1: Clean Inline Suffix",
              description: "Unboxed typography aligned naturally with the phone number, dot divider.",
            },
            {
              id: "option-3" as DesignOption,
              name: "Option 3: Segmented Number & Extension Bar",
              description: "Divided by a clean vertical rule, unified pill container.",
            },
            {
              id: "option-4" as DesignOption,
              name: "Option 4: Modern Micro-Badge with Hash #",
              description: "Compact violet tag with hash symbol instead of call transfer icon.",
            },
            {
              id: "option-5" as DesignOption,
              name: "Option 5: High-Contrast Two-Tone Tag",
              description: "Executive badge with dark EXT pill and light number background.",
            },
            {
              id: "current" as DesignOption,
              name: "Current Design (Before): Superscript with Transfer Icon",
              description: "Uses <sup> tag which shifts above the line with PhoneForwarded icon.",
            },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedDesign(item.id)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                selectedDesign === item.id
                  ? "bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/20"
                  : "bg-slate-50/60 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    {selectedDesign === item.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{item.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                </div>

                {/* Rendered Row Snippet */}
                <div className="p-2 rounded-xl bg-white border border-slate-200/90 flex items-center justify-between gap-3 min-w-[280px] sm:min-w-[340px]">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold select-all text-slate-900">{contact.phone}</span>
                      {renderExtensionBadge(item.id)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      <span>Call</span>
                    </span>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIRECTORY TABLE VIEW ALIGNMENT PREVIEW                                    */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            Directory Desktop Table View Alignment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            How the phone number and extension appear in the desktop table row with the chosen design ({selectedDesign}).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4">Company</th>
                <th className="py-2.5 px-4">Phone & Extension</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/80 transition">
                <td className="py-3 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                      PR
                    </div>
                    <span>{contact.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600">{contact.company}</td>
                <td className="py-3 px-4 font-mono">
                  <div className="flex items-center gap-1.5">
                    <button type="button" className="text-slate-400 hover:text-slate-700">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-semibold select-all text-slate-900">{contact.phone}</span>
                    {renderExtensionBadge(selectedDesign)}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600">{contact.email}</td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10.5px] font-bold">
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
