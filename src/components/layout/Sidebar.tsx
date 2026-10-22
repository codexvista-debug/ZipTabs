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
  Clock,
  Layers,
  LogOut,
  Receipt,
  Users2,
  FolderKanban,
} from "lucide-react";

interface SidebarProps {
  activeTab?: string;
}

export function Sidebar({ activeTab = "invoices" }: SidebarProps) {
  const accountingMenu = [
    {
      id: "dashboard",
      name: "Executive Dashboard",
      icon: LayoutDashboard,
      href: "#",
      badge: null,
      active: activeTab === "dashboard",
    },
    {
      id: "invoices",
      name: "Overdue Invoices & A/R",
      icon: FileSpreadsheet,
      href: "/",
      badge: null,
      active: activeTab === "invoices",
    },
    {
      id: "payroll",
      name: "Payroll & Salaries",
      icon: Wallet,
      href: "#",
      badge: "Soon",
      active: activeTab === "payroll",
    },
    {
      id: "vendors",
      name: "Vendor Statements",
      icon: Building2,
      href: "#",
      badge: "Soon",
      active: activeTab === "vendors",
    },
    {
      id: "aging",
      name: "Receivables & Aging",
      icon: Receipt,
      href: "#",
      badge: "Soon",
      active: activeTab === "aging",
    },
  ];

  const systemMenu = [
    {
      id: "integrations",
      name: "Integrations & APIs",
      icon: Link2,
      href: "#",
      active: false,
    },
    {
      id: "settings",
      name: "Workspace Settings",
      icon: Settings,
      href: "#",
      active: false,
    },
  ];

  return (
    <aside className="w-64 bg-[#090e1a] border-r border-slate-800/80 flex flex-col h-screen select-none shrink-0 text-slate-300">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 font-black text-sm tracking-wider">
            ZT
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-white text-base tracking-tight">
              ZipTabs
            </span>
            <span className="font-bold text-blue-400 text-xs tracking-wider uppercase">
              FINANCE
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {/* Accounting / Finance Section */}
        <div>
          <div className="px-3 pb-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Accounting Menu
          </div>
          <nav className="space-y-1">
            {accountingMenu.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    item.active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        item.active ? "text-white" : "text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System & Configurations */}
        <div>
          <div className="px-3 pb-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            System & Tools
          </div>
          <nav className="space-y-1">
            {systemMenu.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
                >
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{item.name}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Sign Out / User Area */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070b14]/60">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[11px] text-blue-400 font-bold">
              A
            </div>
            <span>Admin Session</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[11px]">Sign Out</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
