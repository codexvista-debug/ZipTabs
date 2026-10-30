"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { ZipTabsLogo } from "@/components/ui/ZipTabsLogo";
import {
  LayoutDashboard,
  FileSpreadsheet,
  NotebookPen,
  CalendarDays,
  FolderOpen,
  HardDrive,
  LogOut,
  KeyRound,
  Calculator,
  Radio,
  FlaskConical,
  X,
} from "lucide-react";

interface SidebarProps {
  activeItem?: string;
  onSelect?: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenSettings?: () => void;
}

export function Sidebar({
  activeItem = "dashboard",
  onSelect,
  isOpen = false,
  onClose,
  onOpenSettings,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const isChief = user?.username?.toLowerCase() === "chief";

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "invoices", label: "Invoices", icon: FileSpreadsheet },
    { id: "notes", label: "Notes & Reminders", icon: NotebookPen },
    { id: "calendar", label: "US Calendar", icon: CalendarDays },
    { id: "drive", label: "Drive", icon: FolderOpen },
    { id: "resources", label: "Resources", icon: Calculator },
    ...(isChief
      ? [
          { id: "logins", label: "Logins", icon: KeyRound },
          { id: "master-control", label: "Master Control", icon: Radio },
        ]
      : []),
    { id: "lab", label: "Design Lab", icon: FlaskConical },
    { id: "usage", label: "Usage", icon: HardDrive },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static w-[260px] bg-[#0c1427] border-r border-[#15203b] flex flex-col h-[100dvh] max-h-[100dvh] select-none shrink-0 text-slate-300 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 sm:h-16 px-4 sm:px-5 flex items-center justify-between border-b border-[#15203b] shrink-0">
          <ZipTabsLogo size="md" showText={true} />
          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items (Scrollable Middle Section) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            WORKSPACE MENU
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    // Left click without modifier keys -> normal client-side tab change
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                      e.preventDefault();
                      onSelect && onSelect(item.id);
                      if (onClose) onClose();
                    }
                  }}
                  onAuxClick={(e) => {
                    // Middle click (scroll wheel click) -> open in new browser tab
                    if (e.button === 1) {
                      e.preventDefault();
                      window.open(`/#${item.id}`, "_blank");
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all text-left cursor-pointer select-none no-underline ${
                    isActive
                      ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/30 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & Sign Out (Pinned at bottom, never cut off) */}
        <div className="p-3 sm:p-4 border-t border-[#15203b] bg-[#090e1a] shrink-0 pb-6 sm:pb-4">
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0 uppercase">
                {user?.username ? user.username.charAt(0) : "C"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  @{user?.username || "chief"}
                </p>
              </div>
            </div>

            {/* Change Password / Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              title="Change Password & Security"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
