import React from "react";
import {
  Search,
  Upload,
  Bell,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

interface HeaderProps {
  title?: string;
  section?: string;
}

export function Header({
  title = "Overdue Invoices & A/R",
  section = "Accounting",
}: HeaderProps) {
  return (
    <header className="h-16 bg-[#090e1a] border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0">
      {/* Breadcrumb & Section Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-400">{section}</span>
          <span className="text-slate-600">/</span>
          <span className="font-semibold text-white tracking-tight">{title}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/30 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          <span>READY</span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative w-64 hidden sm:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoices or vendors..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-200 placeholder:text-slate-500"
          />
        </div>

        {/* Quick Action Button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 border border-blue-500/40 rounded-lg shadow-sm shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import Excel</span>
        </button>

        {/* Icons */}
        <div className="flex items-center gap-1 border-l border-slate-800 pl-3 text-slate-400">
          <button
            title="Privacy & Security"
            className="p-1.5 hover:text-slate-200 rounded-md hover:bg-slate-800/60 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            title="Help"
            className="p-1.5 hover:text-slate-200 rounded-md hover:bg-slate-800/60 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            title="Notifications"
            className="p-1.5 hover:text-slate-200 rounded-md hover:bg-slate-800/60 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
