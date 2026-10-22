"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Sidebar } from "@/components/layout/Sidebar";
import { InvoicesView } from "@/components/invoices/InvoicesView";
import { NotesView } from "@/components/notes/NotesView";
import { USCalendarView } from "@/components/calendar/USCalendarView";
import { UsageView } from "@/components/usage/UsageView";
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  FileText,
  Landmark,
  Clock,
  DollarSign,
  Menu,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "invoices" | "notes" | "calendar" | "usage">("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Loading Session State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
        <span className="text-xs font-bold tracking-widest uppercase text-zinc-500">
          VERIFYING CREDENTIALS...
        </span>
      </div>
    );
  }

  // 2. Unauthenticated State -> Show Login Gate
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // 3. Authenticated Workspace
  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar with Dashboard and Invoices tabs */}
      <Sidebar
        activeItem={activeTab}
        onSelect={(id) => setActiveTab(id as "dashboard" | "invoices")}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile / Tablet Top Navigation Bar */}
        <header className="lg:hidden h-14 bg-[#0c1427] border-b border-[#15203b] px-4 flex items-center justify-between shrink-0 text-white">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8">
          {activeTab === "invoices" ? (
            <InvoicesView />
          ) : activeTab === "notes" ? (
            <NotesView />
          ) : activeTab === "calendar" ? (
            <USCalendarView />
          ) : activeTab === "usage" ? (
            <UsageView />
          ) : (
            <div>
              {/* Top Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 sm:pb-8 border-b border-slate-200/60 mb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    Dashboard
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Overview of pending actions, revenue, and payroll execution.
                  </p>
                </div>

                <div className="text-left sm:text-right bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200/60 shadow-xs sm:shadow-none">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                    UNBILLED REVENUE (WIP)
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tight mt-0.5">
                    $14,754,633.29
                  </div>
                </div>
              </div>

              {/* Section 1: ACTION REQUIRED */}
              <section className="mb-8 sm:mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <h2 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                    ACTION REQUIRED
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {/* Card 1: Timesheets */}
                  <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        TIMESHEETS
                      </span>
                      <div className="text-3xl font-black text-slate-900 mt-2 sm:mt-3">
                        121
                      </div>
                      <div className="text-xs text-slate-400 mt-2 sm:mt-3">
                        Pending Manager Approval
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-6 w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      <span>Review Timesheets</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  {/* Card 2: Expenses */}
                  <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        EXPENSES
                      </span>
                      <div className="text-3xl font-black text-slate-900 mt-2 sm:mt-3">
                        0
                      </div>
                      <div className="text-xs text-slate-400 mt-2 sm:mt-3">
                        Awaiting Verification
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-6 w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      <span>Verify Receipts</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  {/* Card 3: Payroll Runs */}
                  <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs border-l-4 border-l-[#4f46e5] flex flex-col justify-between hover:shadow-md transition-shadow md:col-span-2 xl:col-span-1">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        PAYROLL RUNS
                      </span>
                      <div className="text-3xl font-black text-slate-900 mt-2 sm:mt-3">
                        2
                      </div>
                      <div className="text-xs text-slate-400 mt-2 sm:mt-3">
                        Drafts Pending Execution
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                    >
                      <span>Execute Payroll</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </section>

              {/* Section 2: FINANCIAL MODULES */}
              <section className="pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    FINANCIAL MODULES
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Module 1: Invoices (Clickable -> Switches to Invoices tab!) */}
                  <div
                    onClick={() => setActiveTab("invoices")}
                    className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 transition-colors shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>Invoices & A/R</span>
                        <ArrowRight className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        MANAGE BILLING
                      </div>
                    </div>
                  </div>

                  {/* Module 2 */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors shrink-0">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        Reserve Ledgers
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        CONSULTANT BALANCES
                      </div>
                    </div>
                  </div>

                  {/* Module 3 */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        Timesheets
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        MASTER RECORD
                      </div>
                    </div>
                  </div>

                  {/* Module 4 */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        Projects & Rates
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        BILLING LOGIC
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
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
