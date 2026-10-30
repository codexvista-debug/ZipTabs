"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { InvoicesView } from "@/components/invoices/InvoicesView";
import { NotesView } from "@/components/notes/NotesView";
import { USCalendarView } from "@/components/calendar/USCalendarView";
import { DriveView } from "@/components/drive/DriveView";
import { ResourcesView } from "@/components/resources/ResourcesView";
import { LoginsView } from "@/components/logins/LoginsView";
import { MasterControlView } from "@/components/master-control/MasterControlView";
import { UsageView } from "@/components/usage/UsageView";
import { DesignLabView } from "@/components/lab/DesignLabView";
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal";
import { ZipTabsLogo } from "@/components/ui/ZipTabsLogo";
import { Menu, Loader2 } from "lucide-react";

type TabType = "dashboard" | "invoices" | "notes" | "calendar" | "drive" | "resources" | "logins" | "master-control" | "lab" | "usage";
const VALID_TABS: TabType[] = ["dashboard", "invoices", "notes", "calendar", "drive", "resources", "logins", "master-control", "lab", "usage"];

export default function Home() {
  const { user, isAuthenticated, isLoading, lockoutInfo } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

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

  // 1. Loading Session State (Guards against any flash of website or login UI before security verification)
  if (isLoading || lockoutInfo === null) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
        <span className="text-xs font-bold tracking-widest uppercase text-zinc-500">
          VERIFYING CREDENTIALS...
        </span>
      </div>
    );
  }

  // 2. Unauthenticated State OR IP Locked Out / Lockdown Active -> Show Gate Screen
  if (!isAuthenticated || lockoutInfo?.locked) {
    return <AuthScreen />;
  }

  // 3. Authenticated Workspace
  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar with Dashboard and Invoices tabs */}
      <Sidebar
        activeItem={activeTab}
        onSelect={(id) => handleTabChange(id as TabType)}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile / Tablet Top Navigation Bar */}
        <header className="lg:hidden h-14 bg-[#0c1427] border-b border-[#15203b] px-4 flex items-center justify-between shrink-0 text-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
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

        {/* Content Canvas */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-8">
          <div key={activeTab} className="animate-page-enter min-h-full">
            {activeTab === "invoices" ? (
              <InvoicesView />
            ) : activeTab === "notes" ? (
              <NotesView />
            ) : activeTab === "calendar" ? (
              <USCalendarView />
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
      </div>

      {/* Change Password Dialog Modal */}
      <ChangePasswordModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
