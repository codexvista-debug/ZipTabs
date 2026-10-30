"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  FileSpreadsheet,
  NotebookPen,
  LayoutDashboard,
  HardDrive,
  CalendarDays,
} from "lucide-react";

export type MobileBottomBarStyle = "bottom-style-01" | "bottom-style-02";

interface MobileBottomBarProps {
  styleId?: MobileBottomBarStyle;
  activeTab: string;
  onSelectTab: (tab: any) => void;
  onOpenMenu: () => void;
  isSimulated?: boolean;
}

export function MobileBottomBar({
  styleId = "bottom-style-02",
  activeTab,
  onSelectTab,
  onOpenMenu,
  isSimulated = false,
}: MobileBottomBarProps) {
  // Check for any urgent notes (via localStorage and dashboard cache)
  const [hasUrgentNotes, setHasUrgentNotes] = useState(false);

  useEffect(() => {
    const checkUrgentNotes = () => {
      try {
        const rawNotes = localStorage.getItem("ziptabs_app_notes");
        if (rawNotes) {
          const notes = JSON.parse(rawNotes);
          if (Array.isArray(notes)) {
            const hasUrgent = notes.some(
              (n: any) =>
                !n.is_completed && (n.priority === "urgent" || n.priority === "high")
            );
            if (hasUrgent) {
              setHasUrgentNotes(true);
              return;
            }
          }
        }
        const dashRaw = sessionStorage.getItem("ziptabs_cached_dashboard_v1");
        if (dashRaw) {
          const dash = JSON.parse(dashRaw);
          if (dash.urgentNotesCount > 0) {
            setHasUrgentNotes(true);
            return;
          }
        }
      } catch {}
      setHasUrgentNotes(false);
    };

    checkUrgentNotes();
    window.addEventListener("storage", checkUrgentNotes);
    window.addEventListener("ziptabs-notes-updated", checkUrgentNotes);
    const interval = setInterval(checkUrgentNotes, 4000);
    return () => {
      window.removeEventListener("storage", checkUrgentNotes);
      window.removeEventListener("ziptabs-notes-updated", checkUrgentNotes);
      clearInterval(interval);
    };
  }, []);

  // Variation 01: Dynamic Island Floating Dock (Linear / Apple Modern Detached Pill)
  if (styleId === "bottom-style-01") {
    return (
      <div className={`${isSimulated ? "relative w-full p-2" : "fixed bottom-3 left-3 right-3 z-40 lg:hidden"}`}>
        <div className="bg-[#09090b]/92 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl shadow-black/50 flex items-center justify-around text-slate-400">
          <button
            type="button"
            onClick={() => onSelectTab("dashboard")}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
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
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
              activeTab === "invoices"
                ? "text-blue-400 bg-white/10 shadow-inner"
                : "hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Invoices</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("notes")}
            className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
              activeTab === "notes"
                ? "text-blue-400 bg-white/10 shadow-inner"
                : "hover:text-white"
            }`}
          >
            <NotebookPen className="w-4 h-4" />
            <span>Notes</span>
            {hasUrgentNotes && (
              <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("drive")}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
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
            title="Open other destinations"
          >
            <Menu className="w-4 h-4" />
            <span>More</span>
          </button>
        </div>
      </div>
    );
  }

  // Variation 02: Executive Multi-Tab Dock (Cockpit Full-Width Pinned Chassis - Default)
  // Contains: Dash, Invoices (clean), Notes (urgent notif mark), Calendar, More (☰)
  return (
    <div
      className={`${
        isSimulated ? "relative w-full" : "fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      } h-14 bg-[#0c1427]/98 backdrop-blur-md border-t border-[#1e293b] px-2 flex items-center justify-around text-slate-400 shadow-2xl safe-area-bottom`}
    >
      <button
        type="button"
        onClick={() => onSelectTab("dashboard")}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
          activeTab === "dashboard"
            ? "text-white bg-blue-600/90 shadow-xs"
            : "hover:text-white text-slate-300"
        }`}
      >
        <LayoutDashboard className="w-4 h-4" />
        <span>Dash</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("invoices")}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
          activeTab === "invoices"
            ? "text-white bg-blue-600/90 shadow-xs"
            : "hover:text-white text-slate-300"
        }`}
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>Invoices</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("notes")}
        className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
          activeTab === "notes"
            ? "text-white bg-blue-600/90 shadow-xs"
            : "hover:text-white text-slate-300"
        }`}
      >
        <NotebookPen className="w-4 h-4" />
        <span>Notes</span>
        {hasUrgentNotes && (
          <span className="absolute -top-0.5 right-1 px-1 py-0.2 rounded-full bg-rose-500 text-[8px] font-black text-white leading-none animate-pulse">
            !
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("calendar")}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
          activeTab === "calendar"
            ? "text-white bg-blue-600/90 shadow-xs"
            : "hover:text-white text-slate-300"
        }`}
      >
        <CalendarDays className="w-4 h-4" />
        <span>Calendar</span>
      </button>

      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
        title="Open other destinations"
      >
        <Menu className="w-4 h-4" />
        <span>More</span>
      </button>
    </div>
  );
}
