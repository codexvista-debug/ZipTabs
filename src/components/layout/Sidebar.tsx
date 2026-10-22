import React from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  LayoutDashboard,
  Wallet,
  Building2,
  BarChart3,
  Settings,
  Link2,
  ChevronRight,
  Sparkles,
  LogOut,
  Layers,
} from "lucide-react";

interface SidebarProps {
  activeTab?: string;
}

export function Sidebar({ activeTab = "invoices" }: SidebarProps) {
  const mainNav = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: LayoutDashboard,
      href: "#",
      badge: null,
      active: activeTab === "dashboard",
    },
    {
      id: "invoices",
      name: "Overdue Invoices",
      icon: FileSpreadsheet,
      href: "/",
      badge: "Active",
      active: activeTab === "invoices",
    },
  ];

  const upcomingTools = [
    {
      id: "payroll",
      name: "Payroll",
      icon: Wallet,
      href: "#",
      badge: "Soon",
    },
    {
      id: "vendors",
      name: "Vendor Statements",
      icon: Building2,
      href: "#",
      badge: "Soon",
    },
    {
      id: "reports",
      name: "Reports & Logs",
      icon: BarChart3,
      href: "#",
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen select-none shrink-0">
      {/* Brand / Logo Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 text-base tracking-tight">
                ZipTabs
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 block -mt-0.5">
              Finance Workspace
            </span>
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
          v0.1
        </span>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Section */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Workspace
          </div>
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70 shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        item.active ? "text-emerald-600" : "text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.active
                          ? "bg-emerald-200/60 text-emerald-900"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Work Tools (Upcoming) */}
        <div>
          <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Work Tools</span>
            <Sparkles className="w-3 h-3 text-amber-500" />
          </div>
          <nav className="space-y-1">
            {upcomingTools.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50/70 transition-colors cursor-not-allowed group"
                  title="Coming in future release"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-500" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Preferences */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            System
          </div>
          <nav className="space-y-1">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Link2 className="w-4 h-4 text-slate-400" />
              <span>Integrations</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings</span>
            </a>
          </nav>
        </div>
      </div>

      {/* Bottom Profile Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-all border border-transparent hover:border-slate-200/60 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
              ZT
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                Admin User
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Local Workspace
              </p>
            </div>
          </div>
          <button
            title="Session Info"
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
