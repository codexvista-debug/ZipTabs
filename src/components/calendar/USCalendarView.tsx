"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Calendar,
  CheckCircle2,
  Briefcase,
  AlertCircle,
  HelpCircle,
  LayoutGrid,
  List,
} from "lucide-react";

export interface HolidayItem {
  date: number; // day of month (1-31)
  month: number; // 0-11
  year: number;
  name: string;
  isObserved?: boolean;
}

// Helpers for US Federal Holidays
function getNthDayOfWeek(year: number, month: number, dayOfWeek: number, n: number): number {
  const d = new Date(year, month, 1);
  let count = 0;
  while (d.getMonth() === month) {
    if (d.getDay() === dayOfWeek) {
      count++;
      if (count === n) return d.getDate();
    }
    d.setDate(d.getDate() + 1);
  }
  return 0;
}

function getLastDayOfWeek(year: number, month: number, dayOfWeek: number): number {
  const d = new Date(year, month + 1, 0);
  while (d.getDay() !== dayOfWeek) {
    d.setDate(d.getDate() - 1);
  }
  return d.getDate();
}

export function getUSFederalHolidaysForYear(year: number): HolidayItem[] {
  const holidays: HolidayItem[] = [];

  function addFixed(month: number, day: number, name: string) {
    const d = new Date(year, month, day);
    const target = new Date(d);
    // Sat -> Friday observed, Sun -> Monday observed
    if (d.getDay() === 6) {
      target.setDate(d.getDate() - 1);
    } else if (d.getDay() === 0) {
      target.setDate(d.getDate() + 1);
    }

    if (target.getFullYear() === year) {
      holidays.push({
        date: target.getDate(),
        month: target.getMonth(),
        year,
        name: target.getDate() !== day ? `${name} (Observed)` : name,
        isObserved: target.getDate() !== day,
      });
    }
  }

  // 1. New Year's Day (Jan 1)
  addFixed(0, 1, "New Year's Day");

  // Check if New Year's Day of next year falls on a Saturday (observed Dec 31 of this year)
  const nextJan1 = new Date(year + 1, 0, 1);
  if (nextJan1.getDay() === 6) {
    holidays.push({
      date: 31,
      month: 11,
      year,
      name: "New Year's Day (Observed)",
      isObserved: true,
    });
  }

  // 2. Martin Luther King Jr. Day (3rd Mon in Jan)
  holidays.push({ date: getNthDayOfWeek(year, 0, 1, 3), month: 0, year, name: "Martin Luther King Jr. Day" });

  // 3. Washington's Birthday / Presidents' Day (3rd Mon in Feb)
  holidays.push({ date: getNthDayOfWeek(year, 1, 1, 3), month: 1, year, name: "Presidents' Day" });

  // 4. Memorial Day (Last Mon in May)
  holidays.push({ date: getLastDayOfWeek(year, 4, 1), month: 4, year, name: "Memorial Day" });

  // 5. Juneteenth National Independence Day (June 19)
  addFixed(5, 19, "Juneteenth");

  // 6. Independence Day (July 4)
  addFixed(6, 4, "Independence Day (4th of July)");

  // 7. Labor Day (1st Mon in Sep)
  holidays.push({ date: getNthDayOfWeek(year, 8, 1, 1), month: 8, year, name: "Labor Day" });

  // 8. Columbus Day / Indigenous Peoples' Day (2nd Mon in Oct)
  holidays.push({ date: getNthDayOfWeek(year, 9, 1, 2), month: 9, year, name: "Columbus Day" });

  // 9. Veterans Day (Nov 11)
  addFixed(10, 11, "Veterans Day");

  // 10. Thanksgiving Day (4th Thu in Nov)
  holidays.push({ date: getNthDayOfWeek(year, 10, 4, 4), month: 10, year, name: "Thanksgiving Day" });

  // 11. Christmas Day (Dec 25)
  addFixed(11, 25, "Christmas Day");

  return holidays;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function USCalendarView() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [hoursPerDay, setHoursPerDay] = useState<number>(8); // Standard 8 working hours per day
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid");

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setSelectedDay(1);
  };

  const handleJumpToToday = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  // Calendar calculations
  const daysInCurrentMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun

  // US Holidays in selected month
  const yearHolidays = getUSFederalHolidaysForYear(selectedYear);
  const monthHolidays = yearHolidays.filter((h) => h.month === selectedMonth);
  const holidayMap = new Map<number, HolidayItem>();
  monthHolidays.forEach((h) => holidayMap.set(h.date, h));

  // Compute Working Hours & Breakdown for P1 (1-15) and P2 (16-End)
  let p1WorkingDaysCount = 0;
  let p2WorkingDaysCount = 0;
  let p1TotalWeekdays = 0;
  let p2TotalWeekdays = 0;
  let p1HolidaysCount = 0;
  let p2HolidaysCount = 0;

  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dayDate = new Date(selectedYear, selectedMonth, day);
    const dayOfWeek = dayDate.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isHoliday = holidayMap.has(day);

    if (day <= 15) {
      if (isWeekday) {
        p1TotalWeekdays++;
        if (!isHoliday) {
          p1WorkingDaysCount++;
        }
      }
      if (isHoliday) {
        p1HolidaysCount++;
      }
    } else {
      if (isWeekday) {
        p2TotalWeekdays++;
        if (!isHoliday) {
          p2WorkingDaysCount++;
        }
      }
      if (isHoliday) {
        p2HolidaysCount++;
      }
    }
  }

  const totalWorkingDays = p1WorkingDaysCount + p2WorkingDaysCount;
  const totalWeekdays = p1TotalWeekdays + p2TotalWeekdays;
  const p1TotalHours = p1WorkingDaysCount * hoursPerDay;
  const p2TotalHours = p2WorkingDaysCount * hoursPerDay;
  const totalWorkingHours = p1TotalHours + p2TotalHours;
  const totalHolidaysInMonth = p1HolidaysCount + p2HolidaysCount;

  // Build calendar matrix cells (including leading empty cells)
  const calendarCells: ({ day: number; isCurrentMonth: boolean } | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    calendarCells.push({ day, isCurrentMonth: true });
  }

  // Selected Day Information for mobile & quick inspection
  const selectedDayInfo = (() => {
    if (!selectedDay || selectedDay < 1 || selectedDay > daysInCurrentMonth) return null;
    const dDate = new Date(selectedYear, selectedMonth, selectedDay);
    const dWeek = dDate.getDay();
    const isWeekend = dWeek === 0 || dWeek === 6;
    const isToday =
      today.getDate() === selectedDay &&
      today.getMonth() === selectedMonth &&
      today.getFullYear() === selectedYear;
    const holiday = holidayMap.get(selectedDay);
    const isP1 = selectedDay <= 15;
    const formattedDate = dDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return {
      day: selectedDay,
      formattedDate,
      isWeekend,
      isToday,
      holiday,
      isP1,
    };
  })();

  return (
    <div className="space-y-4 sm:space-y-6 relative pb-16">
      {/* Top Header Row with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              US Calendar & Working Hours
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Standard payroll periods: P1 (Days 1–15) and P2 (Days 16–End) with official US Federal Holidays.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 sm:px-3 text-xs font-extrabold text-slate-900 min-w-[125px] sm:min-w-[140px] text-center select-none">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: 2x2 Grid on Mobile, 4 Cols on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Working Hours */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
            <span className="truncate">Total Hours</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex items-baseline gap-1">
            <span>{totalWorkingHours}</span>
            <span className="text-xs sm:text-sm font-bold text-slate-400">hrs</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="truncate">{totalWorkingDays} workdays</span>
            <span className="font-semibold text-blue-600 hidden sm:inline">Full Month</span>
          </div>
        </div>

        {/* P1 Hours (Days 1–15) */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-blue-200/80 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-blue-600 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <span className="truncate">P1 (1–15)</span>
            <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 text-[9px] sm:text-[10px] font-extrabold shrink-0">
              P1
            </span>
          </div>
          <div className="text-xl sm:text-3xl font-black text-blue-950 tracking-tight mt-1.5 flex items-baseline gap-1">
            <span>{p1TotalHours}</span>
            <span className="text-xs sm:text-sm font-bold text-blue-500">hrs</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="truncate">{p1WorkingDaysCount} days</span>
            {p1HolidaysCount > 0 ? (
              <span className="font-bold text-rose-600 shrink-0">{p1HolidaysCount} off</span>
            ) : (
              <span className="text-slate-400 hidden sm:inline">0 off</span>
            )}
          </div>
        </div>

        {/* P2 Hours (Days 16–30/31) */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-indigo-200/80 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-indigo-600 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <span className="truncate">P2 (16–{daysInCurrentMonth})</span>
            <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 text-[9px] sm:text-[10px] font-extrabold shrink-0">
              P2
            </span>
          </div>
          <div className="text-xl sm:text-3xl font-black text-indigo-950 tracking-tight mt-1.5 flex items-baseline gap-1">
            <span>{p2TotalHours}</span>
            <span className="text-xs sm:text-sm font-bold text-indigo-500">hrs</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="truncate">{p2WorkingDaysCount} days</span>
            {p2HolidaysCount > 0 ? (
              <span className="font-bold text-rose-600 shrink-0">{p2HolidaysCount} off</span>
            ) : (
              <span className="text-slate-400 hidden sm:inline">0 off</span>
            )}
          </div>
        </div>

        {/* US Holidays in Month */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
            <span className="truncate">US Holidays</span>
            <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex items-baseline gap-1">
            <span>{totalHolidaysInMonth}</span>
            <span className="text-xs sm:text-sm font-bold text-slate-400">day{totalHolidaysInMonth !== 1 ? "s" : ""}</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            {monthHolidays.length > 0 ? (
              <span className="font-bold text-rose-700 truncate block">
                {monthHolidays.map((h) => h.name).join(", ")}
              </span>
            ) : (
              <span className="text-slate-400">0 holidays</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Calendar Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Calendar Top Banner with View Switcher & Period Legend */}
        <div className="p-3 sm:p-4 border-b border-slate-200/70 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
                ({daysInCurrentMonth} days)
              </span>
            </div>

            {/* View Mode Toggle: Grid vs Schedule List */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Grid Month View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("agenda")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "agenda"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Schedule List View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs">Schedule</span>
              </button>
            </div>
          </div>

          {/* Period Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span className="text-slate-700">P1 (1–15)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span className="text-slate-700">P2 (16–{daysInCurrentMonth})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-slate-700">US Holiday</span>
            </div>
          </div>
        </div>

        {/* View Mode 1: Month Grid View */}
        {viewMode === "grid" && (
          <>
            {/* Day-of-Week Column Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-wider py-1.5 sm:py-2.5">
              {WEEKDAY_NAMES.map((name, i) => (
                <div key={name} className={i === 0 || i === 6 ? "text-slate-400" : "text-slate-700"}>
                  <span className="sm:hidden">{name.slice(0, 3)}</span>
                  <span className="hidden sm:inline">{name}</span>
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {calendarCells.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[58px] sm:min-h-[105px] bg-slate-50/40 p-1 sm:p-2 border-t border-slate-100"
                    />
                  );
                }

                const day = cell.day;
                const dayDate = new Date(selectedYear, selectedMonth, day);
                const dayOfWeek = dayDate.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() === selectedMonth &&
                  today.getFullYear() === selectedYear;

                const isSelected = selectedDay === day;
                const holiday = holidayMap.get(day);
                const isP1 = day <= 15;

                return (
                  <div
                    key={`day-${day}`}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[58px] sm:min-h-[105px] p-1 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer relative ${
                      holiday
                        ? "bg-rose-50/40 hover:bg-rose-50/70"
                        : isWeekend
                        ? "bg-slate-50/50 text-slate-400"
                        : "bg-white hover:bg-slate-50/80"
                    } ${
                      isSelected
                        ? "ring-2 ring-blue-600 ring-inset bg-blue-50/30 z-10 shadow-xs"
                        : isToday
                        ? "ring-1.5 ring-blue-500/80 ring-inset bg-blue-50/15"
                        : ""
                    }`}
                  >
                    {/* Day Header: Number + Period Badge */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[11px] sm:text-sm font-black ${
                            isToday
                              ? "w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] sm:text-xs shadow-xs"
                              : holiday
                              ? "text-rose-700 font-extrabold"
                              : isWeekend
                              ? "text-slate-400 font-bold"
                              : "text-slate-900 font-bold"
                          }`}
                        >
                          {day}
                        </span>
                        {isToday && (
                          <span className="hidden sm:inline text-[9px] font-black uppercase text-blue-600">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Period Badge (P1 / P2) */}
                      <span
                        className={`text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded shrink-0 leading-tight ${
                          isP1
                            ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                        }`}
                      >
                        {isP1 ? "P1" : "P2"}
                      </span>
                    </div>

                    {/* Day Body: Working Hours or Holiday Banner */}
                    <div className="my-0.5">
                      {holiday ? (
                        <>
                          {/* Mobile View Holiday Chip */}
                          <div className="sm:hidden rounded bg-rose-100/90 border border-rose-300 text-rose-900 text-[8px] font-black py-0.5 px-0.5 text-center leading-tight truncate">
                            🇺🇸 Off
                          </div>
                          {/* Desktop View Holiday Banner */}
                          <div className="hidden sm:block rounded-lg bg-rose-100/80 border border-rose-300 p-1 sm:p-1.5 text-rose-900">
                            <div className="flex items-center gap-1 text-[10px] font-extrabold leading-tight">
                              <span>🇺🇸</span>
                              <span className="truncate">{holiday.name}</span>
                            </div>
                            <div className="text-[9px] text-rose-700 font-semibold mt-0.5">
                              US Federal Holiday
                            </div>
                          </div>
                        </>
                      ) : isWeekend ? (
                        <>
                          <span className="sm:hidden text-[9px] text-slate-300 font-medium text-center block leading-none">
                            -
                          </span>
                          <span className="hidden sm:block text-[10px] font-medium text-slate-400">
                            Weekend
                          </span>
                        </>
                      ) : (
                        <>
                          {/* Mobile View Workday Chip */}
                          <div className="sm:hidden text-center">
                            <span className="inline-block text-[9.5px] font-black text-blue-700 bg-blue-50/90 border border-blue-200/60 rounded px-1 py-0.2 w-full text-center">
                              8h
                            </span>
                          </div>
                          {/* Desktop View Workday Hours */}
                          <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black text-slate-700">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{hoursPerDay} hrs</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Day Footer Sub-info (Desktop only to prevent mobile clutter) */}
                    <div className="hidden sm:block text-[9px] font-medium pt-0.5">
                      {holiday ? (
                        <span className="text-rose-600 font-bold">0h (Holiday)</span>
                      ) : isWeekend ? (
                        <span className="text-slate-400">0h</span>
                      ) : (
                        <span className="text-slate-500 font-semibold">{hoursPerDay}h workday</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Day Quick-Inspect Banner (Specially tailored for mobile clarity) */}
            {selectedDayInfo && (
              <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border-t border-slate-200/80 flex items-center justify-between gap-2.5 sm:gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 shadow-2xs ${
                      selectedDayInfo.holiday
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : selectedDayInfo.isToday
                        ? "bg-blue-600 text-white shadow-blue-500/20"
                        : selectedDayInfo.isWeekend
                        ? "bg-slate-100 text-slate-500 border border-slate-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {selectedDayInfo.day}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                        {selectedDayInfo.formattedDate}
                      </p>
                      <span
                        className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded shrink-0 ${
                          selectedDayInfo.isP1
                            ? "bg-blue-100 text-blue-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {selectedDayInfo.isP1 ? "P1" : "P2"}
                      </span>
                      {selectedDayInfo.isToday && (
                        <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded shrink-0">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 truncate">
                      {selectedDayInfo.holiday ? (
                        <span className="font-extrabold text-rose-700 flex items-center gap-1">
                          <span>🇺🇸</span>
                          <span>{selectedDayInfo.holiday.name}</span>
                          <span className="text-slate-400 font-normal hidden sm:inline">• 0 working hours</span>
                        </span>
                      ) : selectedDayInfo.isWeekend ? (
                        <span className="text-slate-500 font-medium">
                          Weekend — Non-working day (0 hrs)
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <span className="text-blue-600 font-black">{hoursPerDay} Working Hours</span>
                          <span className="text-slate-400 font-normal hidden sm:inline">• Standard Workday</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl shadow-2xs ${
                      selectedDayInfo.holiday
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : selectedDayInfo.isWeekend
                        ? "bg-slate-100 text-slate-500"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {selectedDayInfo.holiday ? "0 hrs" : selectedDayInfo.isWeekend ? "0 hrs" : `${hoursPerDay} hrs`}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* View Mode 2: Mobile-Friendly Agenda / Schedule List */}
        {viewMode === "agenda" && (
          <div className="p-3 sm:p-5 space-y-5">
            {/* Period 1 Schedule */}
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/20 p-3 sm:p-4">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-blue-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-blue-950">
                    Period 1 (Days 1–15)
                  </h4>
                </div>
                <div className="text-xs font-black text-blue-700">
                  {p1TotalHours} Hours ({p1WorkingDaysCount} workdays)
                </div>
              </div>

              <div className="space-y-1.5">
                {Array.from({ length: 15 }, (_, i) => i + 1).map((d) => {
                  const dDate = new Date(selectedYear, selectedMonth, d);
                  const dWeek = dDate.getDay();
                  const isWknd = dWeek === 0 || dWeek === 6;
                  const hol = holidayMap.get(d);
                  const isTod =
                    today.getDate() === d &&
                    today.getMonth() === selectedMonth &&
                    today.getFullYear() === selectedYear;

                  const weekdayName = WEEKDAY_NAMES[dWeek];

                  return (
                    <div
                      key={`agenda-p1-${d}`}
                      onClick={() => setSelectedDay(d)}
                      className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                        hol
                          ? "bg-rose-50/70 border-rose-200 text-rose-900"
                          : isTod
                          ? "bg-blue-100/60 border-blue-400 font-bold"
                          : isWknd
                          ? "bg-white/60 border-slate-200/60 text-slate-400"
                          : "bg-white border-slate-200/80 text-slate-800 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            isTod
                              ? "bg-blue-600 text-white"
                              : hol
                              ? "bg-rose-200 text-rose-800"
                              : isWknd
                              ? "bg-slate-100 text-slate-400"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {d}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {weekdayName}, {MONTH_NAMES[selectedMonth]} {d}
                            {isTod && (
                              <span className="ml-1.5 text-[9px] text-blue-600 font-black uppercase">
                                Today
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {hol ? (
                              <span className="text-rose-600 font-bold">🇺🇸 {hol.name} (US Holiday)</span>
                            ) : isWknd ? (
                              "Weekend"
                            ) : (
                              "Regular Workday"
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        <span
                          className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-md ${
                            hol
                              ? "bg-rose-100 text-rose-700"
                              : isWknd
                              ? "text-slate-400"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {hol ? "0 hrs" : isWknd ? "0 hrs" : `${hoursPerDay} hrs`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Period 2 Schedule */}
            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/20 p-3 sm:p-4">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-indigo-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-indigo-950">
                    Period 2 (Days 16–{daysInCurrentMonth})
                  </h4>
                </div>
                <div className="text-xs font-black text-indigo-700">
                  {p2TotalHours} Hours ({p2WorkingDaysCount} workdays)
                </div>
              </div>

              <div className="space-y-1.5">
                {Array.from({ length: daysInCurrentMonth - 15 }, (_, i) => i + 16).map((d) => {
                  const dDate = new Date(selectedYear, selectedMonth, d);
                  const dWeek = dDate.getDay();
                  const isWknd = dWeek === 0 || dWeek === 6;
                  const hol = holidayMap.get(d);
                  const isTod =
                    today.getDate() === d &&
                    today.getMonth() === selectedMonth &&
                    today.getFullYear() === selectedYear;

                  const weekdayName = WEEKDAY_NAMES[dWeek];

                  return (
                    <div
                      key={`agenda-p2-${d}`}
                      onClick={() => setSelectedDay(d)}
                      className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                        hol
                          ? "bg-rose-50/70 border-rose-200 text-rose-900"
                          : isTod
                          ? "bg-indigo-100/60 border-indigo-400 font-bold"
                          : isWknd
                          ? "bg-white/60 border-slate-200/60 text-slate-400"
                          : "bg-white border-slate-200/80 text-slate-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            isTod
                              ? "bg-indigo-600 text-white"
                              : hol
                              ? "bg-rose-200 text-rose-800"
                              : isWknd
                              ? "bg-slate-100 text-slate-400"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {d}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {weekdayName}, {MONTH_NAMES[selectedMonth]} {d}
                            {isTod && (
                              <span className="ml-1.5 text-[9px] text-indigo-600 font-black uppercase">
                                Today
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {hol ? (
                              <span className="text-rose-600 font-bold">🇺🇸 {hol.name} (US Holiday)</span>
                            ) : isWknd ? (
                              "Weekend"
                            ) : (
                              "Regular Workday"
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        <span
                          className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-md ${
                            hol
                              ? "bg-rose-100 text-rose-700"
                              : isWknd
                              ? "text-slate-400"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {hol ? "0 hrs" : isWknd ? "0 hrs" : `${hoursPerDay} hrs`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payroll Period Breakdown Detail Cards (P1 vs P2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Period 1 Detail */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <h3 className="text-sm font-extrabold text-slate-900">
                Period 1: Days 1–15
              </h3>
            </div>
            <span className="text-xs font-black text-blue-600">
              {p1TotalHours} Hours Total
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Date Range:</span>
              <span className="font-bold text-slate-900">
                {MONTH_NAMES[selectedMonth]} 1 – 15, {selectedYear}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Actual Working Days:</span>
              <span className="font-bold text-slate-900">
                {p1WorkingDaysCount} days ({p1TotalHours} hrs)
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Total Weekdays:</span>
              <span className="font-medium text-slate-600">
                {p1TotalWeekdays} weekdays
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>US Federal Holidays:</span>
              <span className="font-bold text-slate-900">
                {p1HolidaysCount > 0 ? (
                  <span className="text-rose-600 font-bold">{p1HolidaysCount} holiday(s) (0 hrs)</span>
                ) : (
                  "0 holidays"
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Period 2 Detail */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
              <h3 className="text-sm font-extrabold text-slate-900">
                Period 2: Days 16–{daysInCurrentMonth}
              </h3>
            </div>
            <span className="text-xs font-black text-indigo-600">
              {p2TotalHours} Hours Total
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Date Range:</span>
              <span className="font-bold text-slate-900">
                {MONTH_NAMES[selectedMonth]} 16 – {daysInCurrentMonth}, {selectedYear}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Actual Working Days:</span>
              <span className="font-bold text-slate-900">
                {p2WorkingDaysCount} days ({p2TotalHours} hrs)
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Total Weekdays:</span>
              <span className="font-medium text-slate-600">
                {p2TotalWeekdays} weekdays
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>US Federal Holidays:</span>
              <span className="font-bold text-slate-900">
                {p2HolidaysCount > 0 ? (
                  <span className="text-rose-600 font-bold">{p2HolidaysCount} holiday(s) (0 hrs)</span>
                ) : (
                  "0 holidays"
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
