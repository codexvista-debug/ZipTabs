"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { InvoicesView } from "@/components/invoices/InvoicesView";
import { NotesView } from "@/components/notes/NotesView";
import { USCalendarView } from "@/components/calendar/USCalendarView";
import { DirectoryView } from "@/components/directory/DirectoryView";
import { DriveView } from "@/components/drive/DriveView";
import { ResourcesView } from "@/components/resources/ResourcesView";
import { LoginsView } from "@/components/logins/LoginsView";
import { MasterControlView } from "@/components/master-control/MasterControlView";
import { UsageView } from "@/components/usage/UsageView";
import { DesignLabView } from "@/components/lab/DesignLabView";
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal";
import { ZipTabsLogo } from "@/components/ui/ZipTabsLogo";
import { WorkspaceLoadingScreen } from "@/components/ui/WorkspaceLoadingScreen";
import { MobileBottomBar, MobileBottomBarStyle } from "@/components/layout/MobileBottomBar";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Menu, Loader2 } from "lucide-react";
import { ExecutiveToast } from "@/components/ui/ExecutiveToast";
import {
  getOverdueUnresolvedNotes,
  isNoteOverdueUnresolved,
  MinimalNote,
  STORAGE_KEY_NOTES,
} from "@/lib/urgentNotes";
import { supabase } from "@/lib/supabase";

type TabType = "dashboard" | "invoices" | "notes" | "calendar" | "directory" | "drive" | "resources" | "logins" | "master-control" | "lab" | "usage";
const VALID_TABS: TabType[] = ["dashboard", "invoices", "notes", "calendar", "directory", "drive", "resources", "logins", "master-control", "lab", "usage"];

export default function Home() {
  const { user, isAuthenticated, isLoading, lockoutInfo } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  // Mobile Header Mode & Bottom Bar state (defaults to Cockpit Bottom Bar on mobile)
  const [isMobileTopHeaderHidden, setIsMobileTopHeaderHidden] = useState(true);
  const [mobileBottomBarStyle, setMobileBottomBarStyle] = useState<MobileBottomBarStyle>("bottom-style-02");

  // Overdue Unresolved Urgent Notes Tracking (>12h)
  const [overdueUrgentNotes, setOverdueUrgentNotes] = useState<MinimalNote[]>([]);
  const [isUrgentAlertDismissed, setIsUrgentAlertDismissed] = useState(false);

  useEffect(() => {
    const scanNotes = () => {
      const overdue = getOverdueUnresolvedNotes();
      setOverdueUrgentNotes(overdue);
    };

    scanNotes();

    // Fallback: If no notes in localStorage, query Supabase for urgent unresolved notes
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY_NOTES) && supabase) {
      supabase
        .from("app_notes")
        .select("id, title, priority, is_completed, created_at, updated_at, last_opened_at")
        .in("priority", ["urgent", "high"])
        .eq("is_completed", false)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const overdue = data.filter((n: any) => isNoteOverdueUnresolved(n));
            if (overdue.length > 0) {
              setOverdueUrgentNotes(overdue);
            }
          }
        });
    }

    const interval = setInterval(scanNotes, 15000);
    const handleUpdate = () => scanNotes();
    window.addEventListener("ziptabs-note-opened", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("ziptabs-note-opened", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("ziptabs_mobile_top_header_hidden");
      if (savedMode === "false") {
        setIsMobileTopHeaderHidden(false);
      } else {
        setIsMobileTopHeaderHidden(true);
      }
      const savedStyle = localStorage.getItem("ziptabs_mobile_bottom_bar_style") as MobileBottomBarStyle;
      if (savedStyle && ["bottom-style-01", "bottom-style-02"].includes(savedStyle)) {
        setMobileBottomBarStyle(savedStyle);
      } else {
        setMobileBottomBarStyle("bottom-style-02");
      }
    } catch {}

    const handleMobileHeaderMode = (e: any) => {
      if (e.detail) {
        if (e.detail.hideTopHeader !== undefined) {
          setIsMobileTopHeaderHidden(Boolean(e.detail.hideTopHeader));
        }
        if (e.detail.bottomBarStyle) {
          setMobileBottomBarStyle(e.detail.bottomBarStyle);
        }
      }
    };
    window.addEventListener("ziptabs-mobile-header-mode", handleMobileHeaderMode);
    return () => window.removeEventListener("ziptabs-mobile-header-mode", handleMobileHeaderMode);
  }, []);

  // Synchronize and persist active tab across page refreshes and browser history
  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolveTab = (): TabType => {
      const hash = window.location.hash.replace("#", "").toLowerCase() as TabType;
      if (VALID_TABS.includes(hash)) {
        return hash;
      }
      try {
        const stored = localStorage.getItem("ziptabs_active_tab") as TabType;
        if (stored && VALID_TABS.includes(stored)) {
          return stored;
        }
      } catch {}
      return "dashboard";
    };

    const initial = resolveTab();
    setActiveTab(initial);
    if (window.location.hash.replace("#", "") !== initial) {
      window.history.replaceState(null, "", `#${initial}`);
    }

    const handleHashChange = () => {
      const current = window.location.hash.replace("#", "").toLowerCase() as TabType;
      if (VALID_TABS.includes(current)) {
        setActiveTab(current);
        if (mainContentRef.current) {
          mainContentRef.current.scrollTop = 0;
        }
        try {
          localStorage.setItem("ziptabs_active_tab", current);
        } catch {}
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    try {
      localStorage.setItem("ziptabs_active_tab", tab);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `#${tab}`);
      }
    } catch {}
  };

  // 0. Vanish Mode Enforcement: Evict immediately to Wikipedia
  useEffect(() => {
    if (lockoutInfo?.isVanishMode && typeof window !== "undefined") {
      window.location.replace(lockoutInfo.vanishRedirectUrl || "https://www.wikipedia.org");
    }
  }, [lockoutInfo]);

  if (lockoutInfo?.isVanishMode) {
    if (typeof window !== "undefined") {
      window.location.replace(lockoutInfo.vanishRedirectUrl || "https://www.wikipedia.org");
    }
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-600 text-xs font-mono">
        Redirecting...
      </div>
    );
  }

  // 1. Loading Session State (Instantaneous unlock for active sessions; guards against unauth flash)
  if (isLoading) {
    return <WorkspaceLoadingScreen />;
  }

  // 2. Unauthenticated State OR IP Locked Out / Lockdown Active -> Show Gate Screen
  if (!isAuthenticated || lockoutInfo?.locked) {
    return <AuthScreen />;
  }

  // 3. Authenticated Workspace
  return (
    <PullToRefresh>
      <div className="flex h-screen h-[100dvh] bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
        {/* Sidebar (Desktop left sidebar, or Mobile right-flyout drawer when bottom bar is active) */}
        <Sidebar
          activeItem={activeTab}
          onSelect={(id) => handleTabChange(id as TabType)}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          drawerSide={isMobileTopHeaderHidden ? "right" : "left"}
          excludeTabs={
            isMobileTopHeaderHidden
              ? mobileBottomBarStyle === "bottom-style-01"
                ? ["dashboard", "directory", "notes", "drive"]
                : ["dashboard", "directory", "notes", "calendar"]
              : []
          }
        />

        {/* Main Workspace Column */}
        <div className="flex-1 flex flex-col min-w-0 h-full h-[100dvh] overflow-hidden relative">
          {/* Mobile / Tablet Top Navigation Bar (Hidden when testing or active bottom bar mode) */}
          {!isMobileTopHeaderHidden && (
            <header className="sticky top-0 z-30 lg:hidden h-14 bg-[#0c1427]/95 backdrop-blur-md border-b border-[#15203b] px-4 flex items-center justify-between shrink-0 text-white shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Toggle navigation menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="text-xs font-bold text-slate-200 capitalize">
                  {activeTab === "dashboard" ? "Dashboard" : activeTab.replace("-", " ")}
                </span>
              </div>
              <div className="scale-90 origin-right">
                <ZipTabsLogo size="sm" showText={true} />
              </div>
            </header>
          )}

          {/* Content Canvas */}
          <main
            ref={mainContentRef}
            className={`flex-1 overflow-x-hidden px-3.5 sm:px-6 md:px-8 lg:px-10 overscroll-y-auto ${
              isMobileTopHeaderHidden ? "pb-20 lg:pb-0" : ""
            } ${
              activeTab === "invoices"
                ? "overflow-y-hidden py-3 sm:py-4 flex flex-col"
                : "overflow-y-auto py-4 sm:py-8"
            }`}
          >
            <div key={activeTab} className={`animate-page-enter ${activeTab === "invoices" ? "flex-1 flex flex-col min-h-0" : "min-h-full"}`}>
              {activeTab === "invoices" ? (
                <InvoicesView />
              ) : activeTab === "notes" ? (
                <NotesView />
              ) : activeTab === "calendar" ? (
                <USCalendarView />
              ) : activeTab === "directory" ? (
                <DirectoryView />
              ) : activeTab === "drive" ? (
                <DriveView onNavigateUsage={() => handleTabChange("usage")} />
              ) : activeTab === "resources" ? (
                <ResourcesView />
              ) : activeTab === "logins" ? (
                <LoginsView />
              ) : activeTab === "master-control" ? (
                <MasterControlView />
              ) : activeTab === "lab" ? (
                <DesignLabView />
              ) : activeTab === "usage" ? (
                <UsageView />
              ) : (
                <DashboardView onNavigate={(tab) => handleTabChange(tab)} />
              )}
            </div>
          </main>

          {/* Mobile Live Bottom Navigation Bar (Active when top header is disabled) */}
          {isMobileTopHeaderHidden && (
            <MobileBottomBar
              styleId={mobileBottomBarStyle}
              activeTab={activeTab}
              onSelectTab={(tab) => handleTabChange(tab)}
              onOpenMenu={() => setIsMobileMenuOpen((prev) => !prev)}
              onCloseMenu={() => setIsMobileMenuOpen(false)}
              isMenuOpen={isMobileMenuOpen}
            />
          )}
        </div>

        {/* Change Password Dialog Modal */}
        <ChangePasswordModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Global Overdue Urgent Note Alert (Across All Tabs) */}
        {overdueUrgentNotes.length > 0 && !isUrgentAlertDismissed && (
          <ExecutiveToast
            type="error"
            title={
              overdueUrgentNotes.length === 1
                ? `Unresolved: "${overdueUrgentNotes[0].title || "Urgent Note"}"`
                : `${overdueUrgentNotes.length} Urgent Notes Unresolved (>12h)`
            }
            description="High-priority item has not been reviewed for over 12 hours. Tap to review in Notes."
            headerMeta="Executive Priority Alert"
            metric="Unresolved >12h"
            position="top-center"
            variant="monolith"
            durationMs={0}
            action={{
              label: "Jump to Notes",
              onClick: () => {
                handleTabChange("notes");
                setIsUrgentAlertDismissed(true);
              },
            }}
            onClose={() => setIsUrgentAlertDismissed(true)}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
