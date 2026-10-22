"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  DollarSign,
  Users,
  Clock,
  Briefcase,
  CreditCard,
  Shield,
  Home,
  UserPlus,
  Users2,
  Building2,
  FileText,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  activeItem?: string;
  onSelect?: (id: string) => void;
}

export function Sidebar({
  activeItem = "dashboard",
  onSelect,
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
    { id: "unbilled", label: "Unbilled WIP", icon: TrendingUp },
    { id: "invoices", label: "Invoices & A/R", icon: Receipt },
    { id: "payroll", label: "Payroll & Salaries", icon: DollarSign },
    { id: "employees", label: "Employees", icon: Users },
    { id: "timesheets", label: "Timesheets & Leave", icon: Clock },
    { id: "projects", label: "Projects & Rates", icon: Briefcase },
    { id: "expenses", label: "Expenses", icon: CreditCard },
    { id: "immigration", label: "Immigration Ledger", icon: Shield },
    { id: "housing", label: "Housing Ledger", icon: Home },
    { id: "recruitment", label: "Recruitment Ledger", icon: UserPlus },
    { id: "reserve-bench", label: "Reserve & Bench Ledger", icon: Users2 },
    { id: "secondary-reserve", label: "Secondary Reserve", icon: Building2 },
    { id: "receivables-aging", label: "Receivables & Aging", icon: FileText },
  ];

  return (
    <aside className="w-[260px] bg-[#0c1427] border-r border-[#15203b] flex flex-col h-screen select-none shrink-0 text-slate-300">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center border-b border-[#15203b]">
        <div className="flex items-baseline gap-2">
          <span className="font-extrabold text-white text-lg tracking-tight">
            ZipTabs
          </span>
          <span className="font-extrabold text-[#2563eb] text-sm tracking-wider uppercase">
            FINANCE
          </span>
        </div>
      </div>

      {/* Menu Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-2">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          ACCOUNTING MENU
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect && onSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left ${
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sign Out */}
      <div className="p-4 border-t border-[#15203b]">
        <button
          type="button"
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
