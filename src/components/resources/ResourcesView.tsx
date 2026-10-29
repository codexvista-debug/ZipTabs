"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Calculator,
  Percent,
  Copy,
  Check,
  DollarSign,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Receipt,
  Plus,
  Minus,
  Layers,
  Clock,
  ArrowLeft,
  SlidersHorizontal,
  ChevronRight,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";

// Standard prefilled discount percentage options (up to 20%)
const PREFILLED_DISCOUNTS = [1, 2, 2.5, 3, 4, 5, 7.5, 10, 12, 15, 20];

// Common invoice preset amounts
const PRESET_AMOUNTS = [1000, 5000, 10000, 14080, 25000, 50000];

// Dial tick configuration (0.0% to 20.0% in 0.1% steps = 201 ticks)
const MIN_PERCENT = 0;
const MAX_PERCENT = 20;
const STEP_PERCENT = 0.1;
const TOTAL_TICKS = Math.round((MAX_PERCENT - MIN_PERCENT) / STEP_PERCENT) + 1; // 201 ticks
const TICK_WIDTH = 12; // 12px per 0.1% step

export function ResourcesView() {
  // Navigation: "hub" for Resources directory, "discount-calculator" for the active tool
  const [currentView, setCurrentView] = useState<"hub" | "discount-calculator">("discount-calculator");

  // Calculator State (Default $14,080 invoice, 4% discount)
  const [invoiceInput, setInvoiceInput] = useState<string>("14080");
  const [discountPercent, setDiscountPercent] = useState<number>(4.0);
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Wheel scroll container ref & drag states
  const wheelRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  // Parse numeric invoice amount safely
  const invoiceAmount = useMemo(() => {
    const clean = invoiceInput.replace(/[^0-9.]/g, "");
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }, [invoiceInput]);

  // Calculations
  const discountAmount = useMemo(() => {
    return (invoiceAmount * discountPercent) / 100;
  }, [invoiceAmount, discountPercent]);

  const netPayable = useMemo(() => {
    return Math.max(0, invoiceAmount - discountAmount);
  }, [invoiceAmount, discountAmount]);

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(key);
    setTimeout(() => {
      setIsCopied((prev) => (prev === key ? null : prev));
    }, 2500);
  };

  // Center the wheel at a given percentage smoothly
  const centerWheelToPercent = useCallback((pct: number, smooth = true) => {
    if (!wheelRef.current) return;
    isProgrammaticScrollRef.current = true;
    const clamped = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, pct));
    const tickIndex = Math.round((clamped - MIN_PERCENT) / STEP_PERCENT);
    const targetScroll = tickIndex * TICK_WIDTH;

    wheelRef.current.scrollTo({
      left: targetScroll,
      behavior: smooth ? "smooth" : "auto",
    });

    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 350);
  }, []);

  // Center on initial mount
  useEffect(() => {
    if (currentView === "discount-calculator") {
      centerWheelToPercent(discountPercent, false);
    }
  }, [currentView]);

  // Real-time listener: As the user scrolls or drags the wheel, calculate and update percentage dynamically
  const handleWheelScroll = () => {
    if (isProgrammaticScrollRef.current || !wheelRef.current) return;
    const scrollLeft = wheelRef.current.scrollLeft;
    const tickIndex = Math.round(scrollLeft / TICK_WIDTH);
    const calculatedVal = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, tickIndex * STEP_PERCENT));
    const rounded = parseFloat(calculatedVal.toFixed(1));

    if (rounded !== discountPercent) {
      setDiscountPercent(rounded);
    }
  };

  // Adjust percentage by delta (e.g. +0.5% or -0.5%)
  const adjustPercent = (delta: number) => {
    const next = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, parseFloat((discountPercent + delta).toFixed(1))));
    setDiscountPercent(next);
    centerWheelToPercent(next, true);
  };

  // Select a preset percentage
  const handleSelectPreset = (pct: number) => {
    setDiscountPercent(pct);
    centerWheelToPercent(pct, true);
  };

  // Mouse wheel scroll horizontally
  const handleMouseWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (wheelRef.current) {
      wheelRef.current.scrollLeft += e.deltaY;
    }
  };

  // Mouse Drag to spin the wheel
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.pageX - (wheelRef.current?.offsetLeft || 0);
    scrollLeftRef.current = wheelRef.current?.scrollLeft || 0;
  };

  const handleMouseLeaveOrUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !wheelRef.current) return;
    e.preventDefault();
    const x = e.pageX - (wheelRef.current.offsetLeft || 0);
    const walk = (x - startXRef.current) * 1.5;
    wheelRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header & Multi-Resource Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Resources & Calculators</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Interactive workspace utilities, prompt discount estimators, and financial models.
            </p>
          </div>
        </div>

        {/* Top View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentView("hub")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentView === "hub"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Resources (Hub)
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("discount-calculator")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentView === "discount-calculator"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Discount Calculator</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: RESOURCES HUB DIRECTORY (Multiple Resource Tools) */}
      {/* ======================================================== */}
      {currentView === "hub" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Workspace Calculators & Tools
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any calculator or resource below to open it in full view.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Tool Card 1: Discount Calculator (Active & Ready) */}
            <div
              onClick={() => setCurrentView("discount-calculator")}
              className="bg-white rounded-3xl border-2 border-blue-500/80 p-6 shadow-md shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform shadow-xs">
                    <Percent className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Ready To Use</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Discount Calculator
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Calculate prompt payment invoice discounts, client savings deductions, and final net remittance with a high-precision percentage wheel.
                </p>

                {/* Sample Calculation Badge */}
                <div className="mt-4 bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-[11px] font-mono text-slate-700 flex items-center justify-between">
                  <span className="text-slate-500">$14,080 - 4% =</span>
                  <span className="font-bold text-blue-600">$13,516.80</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Launch Calculator</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tool Card 2: Margin & Markup Estimator (Planned) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all opacity-85">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                    Planned
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-800">
                  Margin & Markup Estimator
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Model gross vs. net payroll margins across C2C, W2, and 1099 contracts with standard tax and fee deductions.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Coming Soon</span>
                </span>
                <span className="text-slate-300">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Tool Card 3: Reserve Limit Calculator (Planned) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all opacity-85">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                    In Development
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-800">
                  Reserve Limit Calculator
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Calculate safe reserve thresholds, required buffer funds per consultant, and monthly deduction schedules.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Coming Soon</span>
                </span>
                <span className="text-slate-300">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: DISCOUNT CALCULATOR (Full Interactive View)       */}
      {/* ======================================================== */}
      {currentView === "discount-calculator" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (Inputs: Invoice Amount + Expandable 0.1% Wheel) - 7 cols */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Invoice Amount Input Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Invoice Total Amount</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setInvoiceInput("")}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* Large Amount Input */}
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-black text-slate-400 select-none">
                    $
                  </span>
                  <input
                    type="text"
                    value={invoiceInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      setInvoiceInput(val);
                    }}
                    placeholder="14,080.00"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xl sm:text-3xl font-black text-slate-900 tracking-tight focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 font-mono"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="mt-3.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Presets:
                  </span>
                  {PRESET_AMOUNTS.map((amt) => {
                    const isSelected = invoiceAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setInvoiceInput(String(amt))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        ${amt.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Discount Percentage Card with Expandable (0.1% to 20%) Dus Ka Dum Wheel */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4">
                {/* Header: Title + Real-Time Numerical Badge + Stepper */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-blue-600" />
                      <span>Discount Percentage (0% - 20%)</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Scroll or drag the wheel to adjust in 0.1% increments. Updates in real time.
                    </p>
                  </div>

                  {/* Real-Time Updating Percentage Badge & Steppers */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustPercent(-0.5)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="Minus 0.5%"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-mono font-black text-base sm:text-lg min-w-[75px] text-center shadow-xs">
                      {discountPercent.toFixed(1)}%
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustPercent(0.5)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="Plus 0.5%"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* DUS KA DUM HIGH-PRECISION WHEEL DIAL (0.0% to 20.0% in 0.1% steps) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-1">
                    <span>0.0%</span>
                    <span className="text-blue-600 font-extrabold flex items-center gap-1">
                      <span>← Swipe / Scroll Wheel (0.1% Step) →</span>
                    </span>
                    <span>20.0%</span>
                  </div>

                  {/* Wheel Container with Center Needle Pointer */}
                  <div className="relative bg-slate-900 rounded-2xl p-3 shadow-inner overflow-hidden border border-slate-800 select-none">
                    {/* Fixed Center Needle Pointer */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 pointer-events-none z-20 flex flex-col items-center justify-between">
                      {/* Top Triangle Pointer */}
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.8)]" />
                      {/* Center Needle */}
                      <div className="w-[2px] h-full bg-gradient-to-b from-amber-400 via-amber-300 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] opacity-95" />
                      {/* Bottom Triangle Pointer */}
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-amber-400 drop-shadow-[0_-2px_4px_rgba(251,191,36,0.8)]" />
                    </div>

                    {/* Edge Fade Shadows for Depth */}
                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent pointer-events-none z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent pointer-events-none z-10" />

                    {/* Scrollable Dial Track */}
                    <div
                      ref={wheelRef}
                      onScroll={handleWheelScroll}
                      onWheel={handleMouseWheel}
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseLeaveOrUp}
                      onMouseLeave={handleMouseLeaveOrUp}
                      onMouseMove={handleMouseMove}
                      className="flex items-end overflow-x-auto py-3 px-[50%] cursor-grab active:cursor-grabbing no-scrollbar scrollbar-none"
                    >
                      {Array.from({ length: TOTAL_TICKS }).map((_, idx) => {
                        const pctVal = parseFloat((idx * STEP_PERCENT).toFixed(1));
                        const isWholeNumber = idx % 10 === 0; // 0, 1, 2, 3...
                        const isHalfNumber = idx % 5 === 0 && !isWholeNumber; // 0.5, 1.5, 2.5...
                        const isSelected = Math.abs(discountPercent - pctVal) < 0.05;

                        return (
                          <div
                            key={idx}
                            id={`wheel-tick-${idx}`}
                            onClick={() => {
                              setDiscountPercent(pctVal);
                              centerWheelToPercent(pctVal, true);
                            }}
                            style={{ width: `${TICK_WIDTH}px` }}
                            className="flex flex-col items-center shrink-0 cursor-pointer group"
                          >
                            {/* Tick Notch */}
                            <div
                              className={`rounded-full transition-all ${
                                isSelected
                                  ? "w-1 h-7 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                                  : isWholeNumber
                                  ? "w-[2px] h-5 bg-slate-400 group-hover:bg-slate-300"
                                  : isHalfNumber
                                  ? "w-[1.5px] h-3.5 bg-slate-600 group-hover:bg-slate-500"
                                  : "w-[1px] h-2 bg-slate-800 group-hover:bg-slate-600"
                              }`}
                            />

                            {/* Label displayed on whole numbers or selected */}
                            <div className="h-4 flex items-center justify-center mt-1">
                              {isWholeNumber && (
                                <span
                                  className={`text-[10px] font-mono font-bold ${
                                    isSelected
                                      ? "text-amber-300 font-black text-xs scale-110"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {pctVal}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Smooth Continuous Range Slider */}
                  <div className="mt-3 px-1">
                    <input
                      type="range"
                      min={MIN_PERCENT}
                      max={MAX_PERCENT}
                      step={STEP_PERCENT}
                      value={discountPercent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setDiscountPercent(val);
                        centerWheelToPercent(val, false);
                      }}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                      <span>0%</span>
                      <span>5%</span>
                      <span>10%</span>
                      <span>15%</span>
                      <span>20%</span>
                    </div>
                  </div>
                </div>

                {/* Quick Prefilled Percentage Chips */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Quick Prefilled Percentages:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PREFILLED_DISCOUNTS.map((pct) => {
                      const isCurrent = Math.abs(discountPercent - pct) < 0.05;
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleSelectPreset(pct)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                            isCurrent
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105"
                              : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                          }`}
                        >
                          {pct}%
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Results: Final Net Amount, Discount Deduction, Breakdown) - 5 cols */}
            <div className="lg:col-span-5 space-y-5">
              {/* Main Net Amount Card (Executive Slate & Sapphire Styling) */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/20 border border-slate-800 relative overflow-hidden group">
                {/* Subtle Ambient Glows */}
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative">
                  {/* Top Header Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center text-blue-400 shadow-2xs">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200 block">
                          Net Payable
                        </span>
                        <span className="text-[10px] text-slate-400 block -mt-0.5">
                          Prompt payment remittance
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Final Due</span>
                    </span>
                  </div>

                  {/* Giant Net Amount */}
                  <div className="my-3">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight font-mono text-white drop-shadow-sm">
                      {formatCurrency(netPayable)}
                    </div>
                    <div className="mt-2.5 py-2 px-3 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center gap-2 text-[11px] text-slate-300 flex-wrap">
                      <span className="text-slate-400 font-mono">{formatCurrency(invoiceAmount)}</span>
                      <span className="text-slate-500">-</span>
                      <span className="text-amber-400 font-mono font-bold">{formatCurrency(discountAmount)} ({discountPercent.toFixed(1)}%)</span>
                      <span className="text-slate-500">=</span>
                      <span className="text-emerald-400 font-mono font-bold">Net Total</span>
                    </div>
                  </div>

                  {/* Copy Net Amount Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(netPayable.toFixed(2), "net")}
                    className="mt-4 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 hover:shadow-blue-600/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 border border-blue-400/30"
                  >
                    {isCopied === "net" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span className="text-emerald-200 font-extrabold">Copied Net Amount!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-blue-200" />
                        <span>Copy Net Amount ({formatCurrency(netPayable)})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Detailed Deductions Breakdown Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                  <span>Discount & Deduction Breakdown</span>
                </h3>

                {/* Two Stat Boxes with Instant Copy Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Discount Deduction Box */}
                  <div className="bg-amber-50/70 hover:bg-amber-50 rounded-2xl p-3.5 border border-amber-200/80 transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider truncate">
                        Discount ({discountPercent.toFixed(1)}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(discountAmount.toFixed(2), "discount")}
                        className="p-1 px-1.5 rounded-lg bg-amber-200/60 hover:bg-amber-200 text-amber-900 transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-[10px] font-bold shrink-0 shadow-2xs"
                        title="Copy Discount Deduction"
                      >
                        {isCopied === "discount" ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-[9px] text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-amber-800" />
                            <span className="text-[9px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="mt-2">
                      <span className="text-lg sm:text-xl font-black font-mono text-amber-700 block">
                        -{formatCurrency(discountAmount)}
                      </span>
                      <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">
                        Client Savings
                      </span>
                    </div>
                  </div>

                  {/* Original Invoice Total Box */}
                  <div className="bg-slate-50/80 hover:bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        Gross Invoice
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(invoiceAmount.toFixed(2), "gross")}
                        className="p-1 px-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-[10px] font-bold shrink-0 shadow-2xs"
                        title="Copy Gross Invoice Amount"
                      >
                        {isCopied === "gross" ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-[9px] text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-600" />
                            <span className="text-[9px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="mt-2">
                      <span className="text-lg sm:text-xl font-black font-mono text-slate-800 block">
                        {formatCurrency(invoiceAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                        Before Discount
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Formula Visual */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Calculation Formula:
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 flex-wrap gap-1">
                    <span>{formatCurrency(invoiceAmount)}</span>
                    <span className="text-slate-400">-</span>
                    <span className="text-amber-600 font-extrabold">{formatCurrency(discountAmount)}</span>
                    <span className="text-slate-400">=</span>
                    <span className="text-blue-600 font-black text-sm">{formatCurrency(netPayable)}</span>
                  </div>
                </div>

                {/* Complete Billing Memo Summary Box */}
                <div className="bg-slate-50/60 rounded-2xl p-3.5 border border-slate-200/70 text-[11px] font-mono text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Gross Invoice:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(invoiceAmount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Prompt Discount ({discountPercent.toFixed(1)}%):</span>
                    <span className="font-bold">-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/80 flex justify-between font-bold text-slate-900 text-xs">
                    <span>Total Due:</span>
                    <span className="text-blue-600">{formatCurrency(netPayable)}</span>
                  </div>
                </div>

                {/* Action Buttons: Full Width Copy Button (Refresh button removed as requested) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const memoText = `Invoice Amount: ${formatCurrency(invoiceAmount)}\nDiscount (${discountPercent.toFixed(1)}%): -${formatCurrency(discountAmount)}\nNet Payable: ${formatCurrency(netPayable)}`;
                      handleCopy(memoText, "memo");
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    {isCopied === "memo" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied Full Breakdown Memo!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copy Full Breakdown Memo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
