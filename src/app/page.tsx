import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  FileSpreadsheet,
  Upload,
  Plus,
  ArrowUpRight,
  Filter,
  Download,
  AlertCircle,
  FileCheck2,
  DollarSign,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* 1. Left Sidebar */}
      <Sidebar activeTab="invoices" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 2. Top Header */}
        <Header title="Overdue Invoices" section="ZipTabs" />

        {/* 3. Body Canvas */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Quick Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload Excel File</span>
              </button>
              <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer">
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export Statement</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>No spreadsheet active</span>
            </div>
          </div>

          {/* KPI Summary Cards (Empty State) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Overdue</span>
                <DollarSign className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-800">$0.00</div>
              <div className="mt-1 text-[11px] text-slate-400">Awaiting import</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Overdue Invoices</span>
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-800">0</div>
              <div className="mt-1 text-[11px] text-slate-400">No active records</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Vendors Affected</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-800">0</div>
              <div className="mt-1 text-[11px] text-slate-400">0 pending contacts</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Status</span>
                <FileCheck2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600">Ready</div>
              <div className="mt-1 text-[11px] text-slate-400">Workspace standby</div>
            </div>
          </div>

          {/* Main Blueprint Canvas / Table Area */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs min-h-[420px] flex flex-col">
            {/* Table Header Bar */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <span>SPREADSHEET DATA</span>
                <span className="text-[10px] font-normal text-slate-400">
                  (0 items loaded)
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters Disabled</span>
              </div>
            </div>

            {/* Empty State Canvas */}
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs mb-4">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              <h3 className="text-base font-semibold text-slate-800">
                No invoices imported yet
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 max-w-md leading-relaxed">
                Import an Excel file (<code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">.xlsx</code> or <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">.csv</code>) containing overdue invoices to automatically populate the table and prepare vendor statements.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Choose Spreadsheet File</span>
                </button>
              </div>

              <div className="mt-8 flex items-center gap-1.5 text-[11px] text-slate-400">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Client-side only: your financial data remains in your browser.</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
