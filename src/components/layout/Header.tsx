import React from "react";
import {
  Search,
  Upload,
  Bell,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

interface HeaderProps {
  title?: string;
  section?: string;
}

export function Header({
  title = "Overdue Invoices",
  section = "ZipTabs",
}: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0">
      {/* Breadcrumb & Section Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-400">{section}</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-800">{title}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>READY</span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative w-64 hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter invoices or vendors..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 placeholder:text-slate-400"
          />
        </div>

        {/* Quick Action Button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 rounded-lg transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import Excel</span>
        </button>

        {/* Icons */}
        <div className="flex items-center gap-1 border-l border-slate-200 pl-3 text-slate-400">
          <button
            title="Help & Documentation"
            className="p-1.5 hover:text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            title="Notifications"
            className="p-1.5 hover:text-slate-600 rounded-md hover:bg-slate-50 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
