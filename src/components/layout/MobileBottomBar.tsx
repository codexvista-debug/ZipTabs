"use client";

import React from "react";
import {
  Menu,
  FileSpreadsheet,
  NotebookPen,
  LayoutDashboard,
  HardDrive,
  Upload,
  Plus,
  Search,
  Sparkles,
  ChevronUp,
} from "lucide-react";
import { ZipTabsLogo } from "@/components/ui/ZipTabsLogo";

export type MobileBottomBarStyle = "bottom-style-01" | "bottom-style-02" | "bottom-style-03" | "bottom-style-04";

interface MobileBottomBarProps {
  styleId?: MobileBottomBarStyle;
  activeTab: string;
  onSelectTab: (tab: any) => void;
  onOpenMenu: () => void;
  onQuickAction?: () => void;
  isSimulated?: boolean;
}

export function MobileBottomBar({
  styleId = "bottom-style-01",
  activeTab,
  onSelectTab,
  onOpenMenu,
  onQuickAction,
  isSimulated = false,
}: MobileBottomBarProps) {
  const containerPosition = isSimulated
    ? "relative w-full"
    : "fixed bottom-0 left-0 right-0 z-40 lg:hidden";

  // Variation 01: Executive Bottom Command Bar (Direct Top Header Relocation)
  if (styleId === "bottom-style-01") {
    return (
      <div
        className={`${containerPosition} h-14 bg-[#0c1427]/95 backdrop-blur-md border-t border-[#15203b] px-4 flex items-center justify-between text-white shadow-2xl safe-area-bottom`}
      >
        {/* Left: Menu Trigger */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex items-center gap-2 px-2.5 py-1.5 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
          <span className="text-xs font-bold tracking-tight">Menu</span>
        </button>

        {/* Center: Current Tab Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-200 capitalize truncate max-w-[140px]">
            {activeTab === "dashboard" ? "Dashboard" : activeTab.replace("-", " ")}
          </span>
        </div>

        {/* Right: Quick Tab Switcher / Brand Icon */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === "invoices" ? "dashboard" : "invoices")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {activeTab === "invoices" ? (
              <>
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Dash</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Invoices</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Variation 02: Floating Island Dock (Linear / Modern iOS Detached Pill)
  if (styleId === "bottom-style-02") {
    return (
      <div className={`${isSimulated ? "relative w-full p-2" : "fixed bottom-3 left-3 right-3 z-40 lg:hidden"}`}>
        <div className="bg-[#09090b]/92 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl shadow-black/50 flex items-center justify-around text-slate-400">
          <button
            type="button"
            onClick={() => onSelectTab("dashboard")}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              activeTab === "dashboard"
                ? "text-blue-400 bg-white/10 shadow-inner"
                : "hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("invoices")}
            className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              activeTab === "invoices"
                ? "text-blue-400 bg-white/10 shadow-inner"
                : "hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Invoices</span>
            <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("notes")}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              activeTab === "notes"
                ? "text-blue-400 bg-white/10 shadow-inner"
                : "hover:text-white"
            }`}
          >
            <NotebookPen className="w-4 h-4" />
            <span>Notes</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("drive")}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              activeTab === "drive"
                ? "text-blue-400 bg-white/10 shadow-inner"
                : "hover:text-white"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Vault</span>
          </button>

          <button
            type="button"
            onClick={onOpenMenu}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            <span>All Tabs</span>
          </button>
        </div>
      </div>
    );
  }

  // Variation 03: Action-First Cockpit (Prominent Center Action Launcher)
  if (styleId === "bottom-style-03") {
    return (
      <div
        className={`${containerPosition} h-16 bg-[#0c1427]/98 backdrop-blur-md border-t border-[#1e293b] px-4 flex items-center justify-between text-white shadow-2xl safe-area-bottom relative`}
      >
        {/* Left cluster */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onOpenMenu}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("invoices")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "invoices"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Invoices
          </button>
        </div>

        {/* Center Prominent Floating Action */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-4">
          <button
            type="button"
            onClick={() => {
              if (activeTab !== "invoices") {
                onSelectTab("invoices");
              }
              onQuickAction?.();
            }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-lg shadow-blue-600/40 flex items-center justify-center border-2 border-[#0c1427] active:scale-90 transition-all cursor-pointer"
            title="Upload or Quick Action"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onSelectTab("notes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "notes"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("dashboard")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Dash
          </button>
        </div>
      </div>
    );
  }

  // Variation 04: Minimalist Tactile Rail (Arc Search / Maximum Table Height)
  return (
    <div
      className={`${containerPosition} h-11 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/70 px-4 flex items-center justify-between text-slate-300 shadow-xl safe-area-bottom`}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        className="p-1 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onOpenMenu}
        className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-700/60 text-[11px] font-bold text-slate-200 active:scale-95 transition-all"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span className="capitalize">{activeTab === "dashboard" ? "Dashboard" : activeTab.replace("-", " ")}</span>
        <ChevronUp className="w-3 h-3 text-slate-400 ml-0.5" />
      </button>

      <div className="scale-75 origin-right">
        <ZipTabsLogo size="sm" showText={false} />
      </div>
    </div>
  );
}
