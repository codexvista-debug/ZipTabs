"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUSFederalHolidaysForYear } from "@/components/calendar/USCalendarView";
import {
  FileSpreadsheet,
  NotebookPen,
  CalendarDays,
  HardDrive,
  AlertTriangle,
  ArrowRight,
  Clock,
  DollarSign,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Tag,
  Loader2,
  FileText,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  Shield,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  Flag,
  CalendarCheck,
} from "lucide-react";

interface DashboardViewProps {
  onNavigate: (tab: "dashboard" | "invoices" | "notes" | "calendar" | "drive" | "usage") => void;
}

interface ExpiringDriveFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  expires_at: string;
  days_left: number;
  hours_left: number;
}

interface InvoiceSummaryItem {
  id: string;
  vendor_name: string;
  invoice_number: string;
  amount: number;
  days_overdue: number;
  status: string;
  due_date?: string;
}

interface NoteSummaryItem {
  id: string;
  title: string;
  category: string;
  target_date?: string | null;
  priority?: string;
  is_completed?: boolean;
  content?: string;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Live Metrics
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);
  const [uniqueVendorsCount, setUniqueVendorsCount] = useState(0);
  const [topOverdueInvoices, setTopOverdueInvoices] = useState<InvoiceSummaryItem[]>([]);

  // Notes Metrics
  const [notesCount, setNotesCount] = useState(0);
  const [urgentNotesCount, setUrgentNotesCount] = useState(0);
  const [recentNotes, setRecentNotes] = useState<NoteSummaryItem[]>([]);

  // Usage Metrics
  const [storageBytes, setStorageBytes] = useState(0);
  const [storageFilesCount, setStorageFilesCount] = useState(0);
  const [databaseSizeBytes, setDatabaseSizeBytes] = useState(0);
  const [driveFilesCount, setDriveFilesCount] = useState(0);
  const [expiringDriveFiles, setExpiringDriveFiles] = useState<ExpiringDriveFile[]>([]);

  // Live Indian Standard Time (IST) Clock (Only for Executive Greeting element)
  const [istTimeStr, setIstTimeStr] = useState<string>("");
  const [istDateStr, setIstDateStr] = useState<string>("");

  useEffect(() => {
    const updateIst = () => {
      const d = new Date();
      setIstTimeStr(
        d.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setIstDateStr(
        d.toLocaleDateString("en-US", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    };
    updateIst();
    const timer = setInterval(updateIst, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calendar Calculations for Current Real Month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentDay = now.getDate();
  const currentMonthName = MONTH_NAMES[currentMonthIdx];
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  // Federal Holidays & Working Hours
  const yearHolidays = getUSFederalHolidaysForYear(currentYear);
  const monthHolidays = yearHolidays.filter((h) => h.month === currentMonthIdx);
  const holidayDaySet = new Set(monthHolidays.map((h) => h.date));

  let p1Workdays = 0;
  let p2Workdays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(currentYear, currentMonthIdx, day);
    const dayOfWeek = d.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isHoliday = holidayDaySet.has(day);

    if (isWeekday && !isHoliday) {
      if (day <= 15) p1Workdays++;
      else p2Workdays++;
    }
  }

  const p1Hours = p1Workdays * 8;
  const p2Hours = p2Workdays * 8;
  const totalMonthHours = p1Hours + p2Hours;
  const isP1Active = currentDay <= 15;
  const activePeriodLabel = isP1Active ? "P1 (Days 1–15)" : "P2 (Days 16–31)";
  const activePeriodHours = isP1Active ? p1Hours : p2Hours;

  // Next Upcoming US Holiday
  const upcomingHoliday = yearHolidays
    .filter((h) => {
      const hDate = new Date(h.year, h.month, h.date);
      return hDate.getTime() >= new Date(currentYear, currentMonthIdx, currentDay).getTime();
    })
    .sort((a, b) => new Date(a.year, a.month, a.date).getTime() - new Date(b.year, b.month, b.date).getTime())[0];

  const nextHolidayStr = upcomingHoliday
    ? `${upcomingHoliday.name} (${MONTH_NAMES[upcomingHoliday.month].slice(0, 3)} ${upcomingHoliday.date})`
    : "No upcoming holidays";

  // 1. Executive Dynamic Greeting
  const currentHour = now.getHours();
  const greeting =
    currentHour >= 5 && currentHour < 12
      ? "Good morning"
      : currentHour >= 12 && currentHour < 17
      ? "Good afternoon"
      : "Good evening";

  // 2. Upcoming US Holiday Days Countdown
  let daysUntilHoliday = 0;
  if (upcomingHoliday) {
    const holidayDate = new Date(upcomingHoliday.year, upcomingHoliday.month, upcomingHoliday.date);
    const todayDate = new Date(currentYear, currentMonthIdx, currentDay);
    const diffTime = holidayDate.getTime() - todayDate.getTime();
    daysUntilHoliday = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // 3. Payroll Cycle Calculations (P1 vs P2)
  const isP1 = currentDay <= 15;
  const cycleName = isP1 ? "Cycle P1" : "Cycle P2";
  const cycleTotalDays = isP1 ? 15 : daysInMonth - 15;
  const cycleCurrentDay = isP1 ? currentDay : currentDay - 15;
  const cycleTotalHours = isP1 ? p1Hours : p2Hours;
  const cycleProgressPercent = Math.min(
    100,
    Math.max(0, Math.round((cycleCurrentDay / cycleTotalDays) * 100))
  );

  // Working days remaining in current cycle until cutoff
  let workingDaysRemaining = 0;
  const cycleEndDay = isP1 ? 15 : daysInMonth;
  for (let d = currentDay; d <= cycleEndDay; d++) {
    const dayObj = new Date(currentYear, currentMonthIdx, d);
    const dow = dayObj.getDay();
    const isWk = dow >= 1 && dow <= 5;
    const isHol = holidayDaySet.has(d);
    if (isWk && !isHol) {
      workingDaysRemaining++;
    }
  }

  const cutoffDateLabel = isP1
    ? `${MONTH_NAMES[currentMonthIdx].slice(0, 3)} 15`
    : `${MONTH_NAMES[currentMonthIdx].slice(0, 3)} ${daysInMonth}`;

  // Fetch all live data concurrently
  const loadDashboardData = async () => {
    try {
      if (!supabase) return;

      const [invRes, notesRes, usageRes, driveRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, vendor_name, invoice_number, amount, days_overdue, status, due_date")
          .order("days_overdue", { ascending: false }),
        supabase
          .from("app_notes")
          .select("id, title, category, target_date, priority, is_completed, content, attachments")
          .order("created_at", { ascending: false }),
        supabase.rpc("get_workspace_usage"),
        supabase
          .from("drive_files")
          .select("id, name, size, type, storage_path, expires_at")
          .eq("retention_type", "temporary")
          .order("expires_at", { ascending: true }),
      ]);

      // 1. Process Invoices
      if (invRes.data) {
        const rows = invRes.data as InvoiceSummaryItem[];
        setInvoicesCount(rows.length);

        let totalAmt = 0;
        let ovdCount = 0;
        let ovdAmt = 0;
        const vendors = new Set<string>();

        rows.forEach((inv) => {
          const val = parseFloat(String(inv.amount)) || 0;
          totalAmt += val;
          if (inv.days_overdue > 0 || (inv.status && inv.status.toLowerCase().includes("overdue"))) {
            ovdCount++;
            ovdAmt += val;
          }
          if (inv.vendor_name) vendors.add(inv.vendor_name.trim());
        });

        setTotalInvoiceAmount(totalAmt);
        setOverdueCount(ovdCount);
        setOverdueAmount(ovdAmt);
        setUniqueVendorsCount(vendors.size);

        // Pick top 4 highest overdue invoices
        const topOvd = rows.filter((r) => r.days_overdue > 0).slice(0, 4);
        setTopOverdueInvoices(topOvd);
      }

      // 2. Process Notes
      if (notesRes.data) {
        const notes = notesRes.data as NoteSummaryItem[];
        setNotesCount(notes.length);

        // Calculate urgent / attention notes (due within 7 days or overdue)
        const todayStr = new Date().toISOString().slice(0, 10);
        let urgent = 0;

        notes.forEach((n) => {
          if (n.is_completed) return;
          if (n.priority === "urgent" || n.priority === "high") {
            urgent++;
            return;
          }
          if (n.target_date) {
            const diffTime = new Date(n.target_date).getTime() - new Date(todayStr).getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) {
              urgent++;
            }
          }
        });

        setUrgentNotesCount(urgent);
        setRecentNotes(notes.slice(0, 4));
      }

      // 3. Process Usage
      if (usageRes.data) {
        setStorageBytes(usageRes.data.storage_bytes || 0);
        setStorageFilesCount(usageRes.data.storage_files || 0);
        setDatabaseSizeBytes(usageRes.data.database_size_bytes || 0);
        setDriveFilesCount(usageRes.data.drive_files_count || 0);
      }

      // 4. Process Expiring Temp Stash Drive Files (Starting 3 days before auto-purge)
      if (driveRes.data) {
        const expiring: ExpiringDriveFile[] = [];
        const nowMs = Date.now();
        driveRes.data.forEach((f: any) => {
          if (!f.expires_at) return;
          const expMs = new Date(f.expires_at).getTime();
          const diffMs = expMs - nowMs;
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

          // Notify starting 3 days before deletion (diffDays <= 3)
          if (diffDays <= 3) {
            expiring.push({
              id: f.id,
              name: f.name,
              size: f.size || 0,
              type: f.type || "",
              storage_path: f.storage_path || "",
              expires_at: f.expires_at,
              days_left: Math.max(0, diffDays),
              hours_left: diffHours,
            });
          }
        });
        setExpiringDriveFiles(expiring);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep expiring file in Vault (Permanent)
  const handleKeepInVault = async (fileId: string) => {
    setExpiringDriveFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (supabase) {
      try {
        await supabase
          .from("drive_files")
          .update({
            retention_type: "permanent",
            expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fileId);
      } catch (err) {
        console.error("Keep in vault error:", err);
      }
    }
  };

  // Delete expiring file immediately
  const handleDeleteExpiringNow = async (file: ExpiringDriveFile) => {
    setExpiringDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
    if (supabase) {
      try {
        if (file.storage_path) {
          await supabase.storage.from("note-attachments").remove([file.storage_path]);
        }
        await supabase.from("drive_files").delete().eq("id", file.id);
      } catch (err) {
        console.error("Delete expiring file error:", err);
      }
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Row with Live Total Receivables */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 sm:pb-8 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time operations hub across Invoices, Notes, US Calendar, and Free Plan Storage.
          </p>
        </div>

        {/* Live Aggregated Overdue Balance Header */}
        <div
          onClick={() => onNavigate("invoices")}
          className="text-left sm:text-right bg-white sm:bg-transparent p-4 sm:p-0 rounded-2xl border sm:border-0 border-slate-200/80 shadow-xs sm:shadow-none cursor-pointer group"
          title="Click to view all overdue invoices"
        >
          <div className="flex items-center gap-1.5 sm:justify-end">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              TOTAL OVERDUE BALANCE
            </span>
            <ArrowRight className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight mt-0.5">
            {isLoading ? "Loading..." : formatCurrency(overdueAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Across {overdueCount} overdue invoices · {uniqueVendorsCount} active vendors
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. EXECUTIVE DYNAMIC GREETING & SUMMARY PILL         */}
      {/* ==================================================== */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-slate-50/40 to-blue-50/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-500 flex items-center justify-center shrink-0 shadow-2xs">
                {currentHour >= 5 && currentHour < 17 ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-500" />
                )}
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{greeting}, Chief</span>
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                </h2>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  Real-time command center is synchronized and operational.
                </div>
              </div>
            </div>

            {/* Personalized Summary Pill: Next US Holiday Countdown */}
            <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/90 text-xs text-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => onNavigate("calendar")}
                className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
                title="View upcoming US holidays on calendar"
              >
                <span>🇺🇸</span>
                <span>
                  {upcomingHoliday
                    ? `Next US holiday in ${daysUntilHoliday} days (${upcomingHoliday.name})`
                    : "Next US holiday in 15 days"}
                </span>
              </button>
            </div>
          </div>

          {/* Right Side: Current IST Time & Date (Indian Time) */}
          <div className="flex flex-col items-start md:items-end justify-center px-4 py-3 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-2xs self-start md:self-center shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>🇮🇳 IST · Indian Time</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-mono mt-0.5" suppressHydrationWarning>
              {istTimeStr || "--:--:--"}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5" suppressHydrationWarning>
              {istDateStr}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. PAYROLL CYCLE PROGRESS METER                      */}
      {/* ==================================================== */}
      <div
        onClick={() => onNavigate("calendar")}
        className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        title="Click to view detailed US Calendar & Payroll Breakdown"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left section: Animated Circular Gauge + Headline Details */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* Animated Circular Progress Gauge */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 72 72">
                <circle
                  cx="36"
                  cy="36"
                  r="28"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="6"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="28"
                  fill="transparent"
                  stroke="url(#payrollCycleGradient)"
                  strokeWidth="6"
                  strokeDasharray={175.93}
                  strokeDashoffset={175.93 - (175.93 * cycleProgressPercent) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="payrollCycleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="50%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Circular Gauge Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs sm:text-sm font-black text-slate-900 leading-none">
                  {cycleProgressPercent}%
                </span>
                <span className="text-[9px] font-bold text-indigo-600 mt-0.5 leading-none">
                  {cycleName.replace("Cycle ", "")}
                </span>
              </div>
            </div>

            {/* Gauge Description & Key Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                  Payroll Cycle Progress Meter
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {currentMonthName} {currentYear}
                </span>
              </div>

              {/* Exact Prominent Highlight: Cycle P2: 88h total • Day 12 of 16 • 4 working days remaining until cutoff */}
              <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight mt-1.5 leading-snug">
                {cycleName}: {cycleTotalHours}h total <span className="text-slate-300 mx-1">•</span> Day {cycleCurrentDay} of {cycleTotalDays} <span className="text-slate-300 mx-1">•</span> <span className="text-indigo-600">{workingDaysRemaining} working day{workingDaysRemaining !== 1 ? "s" : ""} remaining</span> until cutoff
              </h3>

              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Cutoff deadline: <strong>{cutoffDateLabel}</strong> ({workingDaysRemaining} workdays to submit approvals)</span>
              </div>
            </div>
          </div>

          {/* Right Action Pill */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-2xs">
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
              <span>Open US Calendar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Animated Linear Progress Bar Gauge with Milestone Ticks */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/70 p-0.5">
            <div
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 h-full rounded-full transition-all duration-1000 ease-out shadow-xs"
              style={{ width: `${cycleProgressPercent}%` }}
            />
          </div>

          {/* Linear Gauge Markers */}
          <div className="flex items-center justify-between mt-2 text-[10px] sm:text-[11px] text-slate-400 font-semibold">
            <span>{isP1 ? "Day 1 (Start)" : "Day 16 (Start)"}</span>
            <span className="hidden sm:inline">Mid-Cycle ({Math.round(cycleTotalDays / 2)}d)</span>
            <span className="text-indigo-600 font-bold">Cutoff: {cutoffDateLabel} ({workingDaysRemaining} workdays left)</span>
          </div>
        </div>
      </div>

      {/* Expiring Temp Stash Drive Files Alert (Notifies 3 days before auto-purge) */}
      {expiringDriveFiles.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Drive Temp Stash Warning</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                    {expiringDriveFiles.length} file{expiringDriveFiles.length > 1 ? "s" : ""} auto-purging within 3 days
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Temporary files are retained for 30 days then deleted. Click <strong>Keep in Vault</strong> to prevent permanent deletion.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("drive")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs self-start md:self-auto cursor-pointer"
            >
              <span>Manage in Drive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List of Expiring Files */}
          <div className="mt-2 divide-y divide-amber-500/15">
            {expiringDriveFiles.slice(0, 5).map((file) => (
              <div key={file.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="font-bold text-xs text-slate-900 truncate max-w-xs sm:max-w-md">{file.name}</span>
                  <span className="text-[11px] text-slate-500">({formatBytes(file.size)})</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                    {file.hours_left < 24 ? `Purges in ${file.hours_left}h` : `Purges in ${file.days_left}d`}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleKeepInVault(file.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    title="Promote to permanent Vault storage"
                  >
                    <Shield className="w-3 h-3" />
                    <span>Keep in Vault</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpiringNow(file)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete immediately"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 1: ACTION REQUIRED / WORKSPACE PULSE */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            ACTION REQUIRED
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {/* Action Card 1: Overdue Invoices */}
          <div
            onClick={() => onNavigate("invoices")}
            className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
                  OVERDUE INVOICES
                </span>
                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200 shrink-0 whitespace-nowrap">
                  {uniqueVendorsCount} Vendors
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 sm:mt-3">
                {isLoading ? "..." : overdueCount}
              </div>
              <div className="text-xs text-amber-700 font-semibold mt-1">
                {isLoading ? "" : formatCurrency(overdueAmount)} Past Due Balance
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Requires statement follow-up & aging review
              </div>
            </div>

            <button
              type="button"
              className="mt-6 w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 group-hover:border-amber-300 bg-white text-slate-700 text-xs font-bold group-hover:bg-amber-50/50 transition-colors cursor-pointer"
            >
              <span>Review Invoices</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </button>
          </div>

          {/* Action Card 2: Notes & Urgent Deadlines */}
          <div
            onClick={() => onNavigate("notes")}
            className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs border-l-4 border-l-rose-500 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
                  NOTES & DEADLINES
                </span>
                <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200 shrink-0 whitespace-nowrap">
                  {urgentNotesCount} Due Soon
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 sm:mt-3">
                {isLoading ? "..." : notesCount}
              </div>
              <div className="text-xs text-rose-700 font-semibold mt-1">
                {urgentNotesCount} item(s) close to target date
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {storageFilesCount} receipts & screenshots stored
              </div>
            </div>

            <button
              type="button"
              className="mt-6 w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 group-hover:border-rose-300 bg-white text-slate-700 text-xs font-bold group-hover:bg-rose-50/50 transition-colors cursor-pointer"
            >
              <span>View Notes & Reminders</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 transition-colors" />
            </button>
          </div>

          {/* Action Card 3: US Payroll Cycle & Working Hours */}
          <div
            onClick={() => onNavigate("calendar")}
            className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs border-l-4 border-l-[#4f46e5] flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group md:col-span-2 xl:col-span-1"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
                  US PAYROLL CYCLE
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 shrink-0 whitespace-nowrap">
                  Active {activePeriodLabel}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 sm:mt-3">
                {activePeriodHours}h
              </div>
              <div className="text-xs text-indigo-700 font-semibold mt-1">
                {currentMonthName} {currentYear}: {totalMonthHours}h Working Hours
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                Next Holiday: <span className="text-slate-600 font-medium">{nextHolidayStr}</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <span>Open US Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: WORKSPACE MODULES (Links to the 4 Real Suites) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            WORKSPACE SUITES
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {/* Module 1: Invoices */}
          <div
            onClick={() => onNavigate("invoices")}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 transition-colors shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                <span>Invoices & A/R</span>
                <ArrowRight className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">
                {invoicesCount} INVOICES ({formatCurrency(totalInvoiceAmount).slice(0, 8)}...)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                50-Row Pagination · Auto-Purge
              </div>
            </div>
          </div>

          {/* Module 2: Notes & Reminders */}
          <div
            onClick={() => onNavigate("notes")}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 transition-colors shrink-0">
              <NotebookPen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                <span>Notes & Reminders</span>
                <ArrowRight className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">
                {notesCount} NOTES · {urgentNotesCount} URGENT
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                Auto-Keywords · Clipboard Paste
              </div>
            </div>
          </div>

          {/* Module 3: US Calendar */}
          <div
            onClick={() => onNavigate("calendar")}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-colors shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                <span>US Calendar</span>
                <ArrowRight className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5">
                P1: {p1Hours}H · P2: {p2Hours}H
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                {currentMonthName} ({totalMonthHours}h Total)
              </div>
            </div>
          </div>

          {/* Module 4: Cloud Drive */}
          <div
            onClick={() => onNavigate("drive")}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-sky-400 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 transition-colors shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                <span>Drive Storage</span>
                <ArrowRight className="w-3 h-3 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mt-0.5">
                {driveFilesCount} DOCUMENTS STORED
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                OneDrive-Style Folders & Docs
              </div>
            </div>
          </div>

          {/* Module 5: Storage & Usage */}
          <div
            onClick={() => onNavigate("usage")}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-colors shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                <span>Usage & Quota</span>
                <ArrowRight className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                {formatBytes(storageBytes)} / 1 GB (HEALTHY)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                {storageFilesCount} Files · Supabase Free Plan
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: REAL-TIME SUMMARY PANELS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Top Overdue Invoices Requiring Follow-Up */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Top Aging Invoices
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("invoices")}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View all ({overdueCount})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {topOverdueInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {isLoading ? "Loading invoices from database..." : "No overdue invoices found."}
                </div>
              ) : (
                topOverdueInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onNavigate("invoices")}
                    className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {inv.vendor_name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Inv #{inv.invoice_number}</span>
                        {inv.due_date && <span>Due: {inv.due_date}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900">
                        {formatCurrency(inv.amount)}
                      </div>
                      <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        {inv.days_overdue} days overdue
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Total Overdue: {formatCurrency(overdueAmount)}</span>
            <span className="font-semibold text-slate-600">{uniqueVendorsCount} distinct vendors</span>
          </div>
        </div>

        {/* Right Panel: Active Notes & Reminders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Notes & Deadlines
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("notes")}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View all ({notesCount})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {recentNotes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {isLoading ? "Loading notes from database..." : "No active notes created yet."}
                </div>
              ) : (
                recentNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => onNavigate("notes")}
                    className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {note.category || "Quick Notes"}
                        </span>
                        {note.priority === "urgent" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Urgent 🔥
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {note.title}
                      </div>
                    </div>

                    {note.target_date && (
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{note.target_date}</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>{urgentNotesCount} item(s) due soon</span>
            <span className="font-semibold text-slate-600">{notesCount} total notes logged</span>
          </div>
        </div>
      </section>
    </div>
  );
}
