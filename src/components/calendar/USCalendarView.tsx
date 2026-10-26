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

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
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

  return (
    <div className="space-y-6 relative pb-16">
      {/* Top Header Row with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
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

            <span className="px-3 text-xs font-extrabold text-slate-900 min-w-[140px] text-center select-none">
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

      {/* KPI Cards: Total Hours, P1 Hours (1-15), P2 Hours (16-End), US Holidays */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Working Hours */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Working Hours</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2 flex items-baseline gap-1">
            <span>{totalWorkingHours}</span>
            <span className="text-sm font-bold text-slate-400">hrs</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{totalWorkingDays} working days ({hoursPerDay}h/day)</span>
            <span className="font-semibold text-blue-600">Full Month</span>
          </div>
        </div>

        {/* P1 Hours (Days 1–15) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider">
            <span className="truncate">P1 Hours (1–15)</span>
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-extrabold shrink-0 whitespace-nowrap">
              Days 1–15
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight mt-2 flex items-baseline gap-1">
            <span>{p1TotalHours}</span>
            <span className="text-sm font-bold text-blue-500">hrs</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{p1WorkingDaysCount} working days</span>
            {p1HolidaysCount > 0 ? (
              <span className="font-bold text-rose-600">{p1HolidaysCount} holiday</span>
            ) : (
              <span className="text-slate-400">0 holidays</span>
            )}
          </div>
        </div>

        {/* P2 Hours (Days 16–30/31) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/80 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/30">
          <div className="flex items-center justify-between gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <span className="truncate">P2 Hours (16–{daysInCurrentMonth})</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-extrabold shrink-0 whitespace-nowrap">
              Days 16–{daysInCurrentMonth}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight mt-2 flex items-baseline gap-1">
            <span>{p2TotalHours}</span>
            <span className="text-sm font-bold text-indigo-500">hrs</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{p2WorkingDaysCount} working days</span>
            {p2HolidaysCount > 0 ? (
              <span className="font-bold text-rose-600">{p2HolidaysCount} holiday</span>
            ) : (
              <span className="text-slate-400">0 holidays</span>
            )}
          </div>
        </div>

        {/* US Holidays in Month */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>US Federal Holidays</span>
            <Flag className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2 flex items-baseline gap-1">
            <span>{totalHolidaysInMonth}</span>
            <span className="text-sm font-bold text-slate-400">holiday{totalHolidaysInMonth !== 1 ? "s" : ""}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {monthHolidays.length > 0 ? (
              <span className="font-bold text-rose-700">
                {monthHolidays.map((h) => `${h.name} (${MONTH_NAMES[selectedMonth].slice(0, 3)} ${h.date})`).join(", ")}
              </span>
            ) : (
              <span className="text-slate-400">No federal holidays in {MONTH_NAMES[selectedMonth]}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Calendar Top Banner with Period Legend */}
        <div className="p-4 border-b border-slate-200/70 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 tracking-tight">
              {MONTH_NAMES[selectedMonth]} {selectedYear} Calendar
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({daysInCurrentMonth} days)
            </span>
          </div>

          {/* Period Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-700">P1 (Days 1–15)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span className="text-slate-700">P2 (Days 16–{daysInCurrentMonth})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-700">US Holiday</span>
            </div>
          </div>
        </div>

        {/* Day-of-Week Column Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center text-xs font-black text-slate-600 uppercase tracking-wider py-2.5">
          {WEEKDAY_NAMES.map((name, i) => (
            <div key={name} className={i === 0 || i === 6 ? "text-slate-400" : "text-slate-700"}>
              {name}
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
                  className="min-h-[96px] sm:min-h-[110px] bg-slate-50/40 p-2 border-t border-slate-100"
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

            const holiday = holidayMap.get(day);
            const isP1 = day <= 15;

            return (
              <div
                key={`day-${day}`}
                className={`min-h-[96px] sm:min-h-[110px] p-2 sm:p-2.5 flex flex-col justify-between transition-colors ${
                  holiday
                    ? "bg-rose-50/50 hover:bg-rose-50/80"
                    : isWeekend
                    ? "bg-slate-50/60 text-slate-400"
                    : "bg-white hover:bg-slate-50/80"
                } ${isToday ? "ring-2 ring-blue-600 ring-inset bg-blue-50/20" : ""}`}
              >
                {/* Day Header: Number + Period Pill */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs sm:text-sm font-black ${
                        isToday
                          ? "w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs"
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

                  {/* P1 or P2 Badge */}
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                      isP1
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    }`}
                  >
                    {isP1 ? "P1" : "P2"}
                  </span>
                </div>

                {/* Day Body: Holiday Notice or Working Hours */}
                <div className="mt-1">
                  {holiday ? (
                    <div className="rounded-lg bg-rose-100/80 border border-rose-300 p-1 sm:p-1.5 text-rose-900">
                      <div className="flex items-center gap-1 text-[10px] font-extrabold leading-tight">
                        <span>🇺🇸</span>
                        <span className="truncate">{holiday.name}</span>
                      </div>
                      <div className="text-[9px] text-rose-700 font-semibold mt-0.5">
                        US Federal Holiday
                      </div>
                    </div>
                  ) : isWeekend ? (
                    <span className="text-[10px] font-medium text-slate-400">
                      Weekend
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-[11px] font-black text-slate-700">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{hoursPerDay} hrs</span>
                    </div>
                  )}
                </div>

                {/* Day Footer Sub-info */}
                <div className="text-[9px] font-medium pt-1">
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
