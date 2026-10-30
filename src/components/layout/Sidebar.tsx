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
  drawerSide?: "left" | "right";
  excludeTabs?: string[];
}

export function Sidebar({
  activeItem = "dashboard",
  onSelect,
  isOpen = false,
  onClose,
  onOpenSettings,
  drawerSide = "left",
  excludeTabs = [],
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
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer / Popup Menu */}
      <aside
        className={`select-none shrink-0 text-slate-300 transition-all duration-200 ease-out z-50 flex flex-col ${
          drawerSide === "right"
            ? `fixed bottom-16 right-3 w-64 max-w-[calc(100vw-24px)] rounded-2xl bg-[#0c1427]/98 backdrop-blur-2xl border border-[#1e293b] shadow-2xl shadow-black/80 overflow-hidden ${
                isOpen
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 translate-y-2 pointer-events-none"
              } lg:static lg:bottom-auto lg:right-auto lg:inset-y-0 lg:w-[260px] lg:h-[100dvh] lg:max-h-[100dvh] lg:rounded-none lg:border-r lg:border-[#15203b] lg:border-t-0 lg:border-l-0 lg:border-b-0 lg:shadow-none lg:opacity-100 lg:scale-100 lg:translate-y-0 lg:pointer-events-auto`
            : `fixed inset-y-0 left-0 w-[260px] bg-[#0c1427] border-r border-[#15203b] h-[100dvh] max-h-[100dvh] ${
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
              } lg:static`
        }`}
      >
        {/* Brand Header (No "MORE TABS" badge per user request) */}
        <div className={`flex items-center justify-between border-b border-[#15203b] shrink-0 ${
          drawerSide === "right" ? "h-12 px-3.5 sm:h-14 lg:h-16 lg:px-5" : "h-14 sm:h-16 px-4 sm:px-5"
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <ZipTabsLogo size="sm" showText={true} />
          </div>
          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
            title="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Items (Occupies only the exact height needed on mobile popup) */}
        <div className={`overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 ${
          drawerSide === "right" ? "p-2 max-h-[60vh] lg:flex-1 lg:max-h-none lg:p-3" : "flex-1 min-h-0 px-3 py-3 sm:py-4"
        }`}>
          <div className="px-2.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {drawerSide === "right" ? "OTHER DESTINATIONS" : "WORKSPACE MENU"}
          </div>

          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              const isExcludedOnMobile =
                drawerSide === "right" && excludeTabs.includes(item.id);

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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all text-left cursor-pointer select-none no-underline ${
                    isExcludedOnMobile ? "hidden lg:flex" : "flex"
                  } ${
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

        {/* Bottom User Profile & Sign Out Icon (Snug compact row) */}
        <div className={`border-t border-[#15203b] bg-[#090e1a] shrink-0 ${
          drawerSide === "right" ? "p-2.5 px-3 lg:p-3 sm:lg:p-4" : "p-3 sm:p-4"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] sm:text-xs font-bold text-zinc-200 shrink-0 uppercase">
                {user?.username ? user.username.charAt(0) : "C"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  @{user?.username || "chief"}
                </p>
              </div>
            </div>

            {/* Sign Out Icon Button */}
            <button
              type="button"
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 hover:text-rose-400 transition-colors" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
