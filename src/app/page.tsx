import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Filter,
  Download,
  AlertCircle,
  FileCheck2,
  DollarSign,
  Users,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex h-screen bg-[#070c18] font-sans text-slate-100 overflow-hidden">
      {/* 1. Left Sidebar (Leopard FINANCE inspired) */}
      <Sidebar activeTab="invoices" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 2. Top Header */}
        <Header title="Overdue Invoices & A/R" section="Accounting Menu" />

        {/* 3. Body Canvas */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Quick Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0c1426] p-4 rounded-xl border border-slate-800/80 shadow-md">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Excel File</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 hover:text-white border border-slate-700/70 rounded-lg transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Export Statement</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              <span>No spreadsheet loaded</span>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0c1426] p-5 rounded-xl border border-slate-800/80 hover:border-blue-500/30 transition-all shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Total Overdue</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-white tracking-tight">
                $0.00
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Awaiting file import
              </div>
            </div>

            <div className="bg-[#0c1426] p-5 rounded-xl border border-slate-800/80 hover:border-blue-500/30 transition-all shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Overdue Invoices</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-white tracking-tight">
                0
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                0 active records
              </div>
            </div>

            <div className="bg-[#0c1426] p-5 rounded-xl border border-slate-800/80 hover:border-blue-500/30 transition-all shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Vendors Affected</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-white tracking-tight">
                0
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                0 pending recipients
              </div>
            </div>

            <div className="bg-[#0c1426] p-5 rounded-xl border border-slate-800/80 hover:border-blue-500/30 transition-all shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>System Status</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-emerald-400 tracking-tight">
                Standby
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Client parser ready
              </div>
            </div>
          </div>

          {/* Main Table / Dropzone Blueprint Canvas */}
          <div className="bg-[#0c1426] rounded-xl border border-slate-800/80 shadow-md min-h-[440px] flex flex-col">
            {/* Table Header Bar */}
            <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="tracking-wider uppercase text-slate-400 text-[11px]">
                  Spreadsheet Data Grid
                </span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                  0 rows
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters Disabled</span>
              </div>
            </div>

            {/* Empty State / Dropzone Canvas */}
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-full max-w-xl p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-[#090e1a]/40 transition-all flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md shadow-blue-600/20 mb-4">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>

                <h3 className="text-base font-semibold text-white tracking-tight">
                  No invoices imported yet
                </h3>
                <p className="mt-2 text-xs text-slate-400 max-w-md leading-relaxed">
                  Import an Excel spreadsheet (<code className="text-blue-300 bg-blue-950/80 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">.xlsx</code> or <code className="text-blue-300 bg-blue-950/80 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">.csv</code>) containing overdue invoices to load the interactive data grid and generate vendor-ready statements.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Choose Spreadsheet File</span>
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Privacy protected: parsed 100% locally in your browser.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
