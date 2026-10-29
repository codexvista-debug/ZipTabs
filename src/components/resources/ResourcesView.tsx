"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Calculator,
  Percent,
  Copy,
  Check,
  DollarSign,
  TrendingDown,
  Receipt,
  Plus,
  Minus,
  Layers,
  Clock,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";

// Standard prompt payment discount percentage presets
const PREFILLED_DISCOUNTS = [1, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20];

// Common invoice preset amounts
const PRESET_AMOUNTS = [1000, 5000, 10000, 14080, 25000, 50000];

// Caliper dial tick configuration (0.0% to 20.0% in 0.1% steps = 201 ticks)
const MIN_PERCENT = 0;
const MAX_PERCENT = 20;
const STEP_PERCENT = 0.1;
const TOTAL_TICKS = Math.round((MAX_PERCENT - MIN_PERCENT) / STEP_PERCENT) + 1; // 201 ticks
const TICK_WIDTH = 12; // 12px per 0.1% step

export function ResourcesView() {
  // Navigation: "hub" for Resources directory, "discount-calculator" for the active tool
  const [currentView, setCurrentView] = useState<"hub" | "discount-calculator">("discount-calculator");

  // Calculator State (Default $14,080.00 invoice, 4.0% discount)
  const [invoiceInput, setInvoiceInput] = useState<string>("14,080.00");
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

  // Currency Formatter with standard commas and two decimals
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Format amount input on change (permits typing numbers, commas, decimal)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const filtered = raw.replace(/[^0-9.,]/g, "");
    setInvoiceInput(filtered);
  };

  // Format amount input on blur to standard comma + two decimals ($14,080.00)
  const handleAmountBlur = () => {
    const clean = invoiceInput.replace(/[^0-9.]/g, "");
    const val = parseFloat(clean);
    if (!isNaN(val) && val >= 0) {
      setInvoiceInput(
        val.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    } else {
      setInvoiceInput("0.00");
    }
  };

  // Preset amount selection (formats with commas and two decimals)
  const handleSelectPresetAmount = (amt: number) => {
    setInvoiceInput(
      amt.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(key);
    setTimeout(() => {
      setIsCopied((prev) => (prev === key ? null : prev));
    }, 2500);
  };

  // Center the caliper dial at a given percentage smoothly
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
    }, 250);
  }, []);

  // Center on initial mount
  useEffect(() => {
    if (currentView === "discount-calculator") {
      centerWheelToPercent(discountPercent, false);
    }
  }, [currentView]);

  // Real-time listener: As the user drags the caliper, calculate and update percentage dynamically
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

  // Adjust percentage by delta (strictly in 0.1% steps)
  const adjustPercent = (delta: number) => {
    setDiscountPercent((prev) => {
      const next = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, parseFloat((prev + delta).toFixed(1))));
      centerWheelToPercent(next, true);
      return next;
    });
  };

  // Select a preset percentage
  const handleSelectPreset = (pct: number) => {
    setDiscountPercent(pct);
    centerWheelToPercent(pct, true);
  };

  // Mouse wheel scroll: each notch steps by exactly 0.1%
  const handleMouseWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const direction = e.deltaY > 0 ? 0.1 : -0.1;
    adjustPercent(direction);
  };

  // Mouse Drag to slide the caliper dial
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
    const walk = (x - startXRef.current) * 1.2;
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
              Interactive workspace utilities, prompt discount estimators, and financial settlement models.
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
              className="bg-white rounded-2xl border-2 border-blue-500/80 p-6 shadow-md shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group"
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
                  Calculate prompt payment invoice discounts, client savings deductions, and final net remittance with a high-precision percentage caliper.
                </p>

                {/* Sample Calculation Badge */}
                <div className="mt-4 bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-[11px] font-mono text-slate-700 flex items-center justify-between">
                  <span className="text-slate-500">$14,080.00 - 4.0% =</span>
                  <span className="font-bold text-blue-600">$13,516.80</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Launch Calculator</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tool Card 2: Margin & Markup Estimator (Planned) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all opacity-85">
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
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all opacity-85">
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
      {/* VIEW 2: DISCOUNT CALCULATOR (Executive Precision View)     */}
      {/* ======================================================== */}
      {currentView === "discount-calculator" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (Inputs: Gross Invoice + Precision Caliper Dial) - 7 cols */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Gross Invoice Total Amount Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Gross Invoice Total Amount</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enter the billed invoice amount prior to prompt settlement discount deductions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvoiceInput("0.00")}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>

                {/* Amount Input with Live Comma & Two Decimals Support */}
                <div className="relative flex items-center bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                  <span className="text-2xl sm:text-3xl font-black text-slate-400 font-mono select-none mr-2">
                    $
                  </span>
                  <input
                    type="text"
                    value={invoiceInput}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
                    placeholder="14,080.00"
                    className="w-full bg-transparent text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono focus:outline-none placeholder:text-slate-300"
                  />
                </div>

                {/* Quick Preset Buttons (All formatted with commas and two decimals) */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Presets:
                  </span>
                  {PRESET_AMOUNTS.map((amt) => {
                    const isSelected = Math.abs(invoiceAmount - amt) < 0.01;
                    const formattedPreset = amt.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSelectPresetAmount(amt)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        ${formattedPreset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Prompt Discount Caliper Gauge (0.0% – 20.0%) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                {/* Header: Title + Precision 0.1% Steppers */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-blue-600" />
                      <span>Prompt Discount Rate (0.0% – 20.0%)</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Precision linear gauge · Stepper & mouse scroll increment by <strong>0.1%</strong>
                    </p>
                  </div>

                  {/* 0.1% Steppers & Display */}
                  <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => adjustPercent(-0.1)}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200/60 shadow-2xs"
                      title="Minus 0.1%"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="px-3 py-1 font-mono font-black text-sm text-blue-700 min-w-[65px] text-center select-none">
                      {discountPercent.toFixed(1)}%
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustPercent(0.1)}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200/60 shadow-2xs"
                      title="Plus 0.1%"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* PRECISION CALIPER GAUGE (0.0% to 20.0% in 0.1% increments) */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-1 font-mono">
                    <span>0.0%</span>
                    <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1">
                      <span>← Drag or Scroll Mouse Wheel (0.1% Step) →</span>
                    </span>
                    <span>20.0%</span>
                  </div>

                  {/* High-End Obsidian Caliper Track */}
                  <div className="relative bg-[#0c1427] rounded-xl py-2.5 px-3 shadow-inner overflow-hidden border border-[#1e293b] select-none">
                    {/* Centered Precision Needle */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 pointer-events-none z-20 flex flex-col items-center justify-between">
                      {/* Top Triangle Pointer */}
                      <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-blue-400 drop-shadow-[0_2px_4px_rgba(96,165,250,0.8)]" />
                      {/* Laser Hairline */}
                      <div className="w-[2px] h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)] opacity-95" />
                      {/* Bottom Triangle Pointer */}
                      <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-blue-400 drop-shadow-[0_-2px_4px_rgba(96,165,250,0.8)]" />
                    </div>

                    {/* Edge Fade Shadows for Visual Depth */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0c1427] via-[#0c1427]/80 to-transparent pointer-events-none z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0c1427] via-[#0c1427]/80 to-transparent pointer-events-none z-10" />

                    {/* Scrollable Tick Track */}
                    <div
                      ref={wheelRef}
                      onScroll={handleWheelScroll}
                      onWheel={handleMouseWheel}
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseLeaveOrUp}
                      onMouseLeave={handleMouseLeaveOrUp}
                      onMouseMove={handleMouseMove}
                      className="flex items-end overflow-x-auto py-2.5 px-[50%] cursor-grab active:cursor-grabbing no-scrollbar scrollbar-none"
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
                                  ? "w-[2px] h-6 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]"
                                  : isWholeNumber
                                  ? "w-[2px] h-4 bg-slate-300 group-hover:bg-slate-200"
                                  : isHalfNumber
                                  ? "w-[1.5px] h-3 bg-slate-500 group-hover:bg-slate-400"
                                  : "w-[1px] h-1.5 bg-slate-700 group-hover:bg-slate-500"
                              }`}
                            />

                            {/* Number label for whole percentages */}
                            <div className="h-4 flex items-center justify-center mt-1">
                              {isWholeNumber && (
                                <span
                                  className={`text-[10px] font-mono ${
                                    isSelected
                                      ? "text-blue-300 font-bold scale-105"
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
                </div>

                {/* Standard Commercial Terms Quick Chips */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Standard Commercial Prompt Terms:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PREFILLED_DISCOUNTS.map((pct) => {
                      const isCurrent = Math.abs(discountPercent - pct) < 0.05;
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleSelectPreset(pct)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                            isCurrent
                              ? "bg-blue-600 text-white shadow-xs scale-105"
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

            {/* Right Column (Settlement & Remittance Ledger) - 5 cols */}
            <div className="lg:col-span-5 space-y-5">
              {/* Card 1: Executive Remittance Due Card */}
              <div className="bg-[#0c1427] text-white rounded-2xl p-6 border border-[#1e293b] shadow-xl relative overflow-hidden group">
                <div className="relative">
                  {/* Top Header Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-400/25 flex items-center justify-center text-blue-400 shadow-2xs">
                        <Receipt className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Remittance Payable
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      Prompt Settlement
                    </span>
                  </div>

                  {/* Net Amount Display */}
                  <div className="my-2">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight font-mono text-white">
                      {formatCurrency(netPayable)}
                    </div>
                    {/* Mathematical Formula Bar with Commas and Decimals */}
                    <div className="mt-2.5 py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 text-xs text-slate-300 font-mono flex-wrap">
                      <span className="text-slate-400">{formatCurrency(invoiceAmount)}</span>
                      <span className="text-slate-500">-</span>
                      <span className="text-amber-400 font-bold">{formatCurrency(discountAmount)} ({discountPercent.toFixed(1)}%)</span>
                      <span className="text-slate-500">=</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(netPayable)}</span>
                    </div>
                  </div>

                  {/* Copy Net Amount Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(netPayable.toFixed(2), "net")}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 border border-blue-400/30"
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

              {/* Card 2: Accounting Statement Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-slate-500" />
                  <span>Settlement Breakdown</span>
                </h3>

                {/* Accounting Ledger Statement */}
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                  {/* Row 1: Gross Invoice */}
                  <div className="p-3 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-700 block">Gross Invoice Amount</span>
                      <span className="text-[10px] text-slate-400 block">Full face value before deductions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(invoiceAmount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(invoiceAmount.toFixed(2), "gross")}
                        className="p-1 rounded-md hover:bg-slate-200/70 text-slate-500 transition-colors cursor-pointer"
                        title="Copy Gross Amount"
                      >
                        {isCopied === "gross" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Prompt Discount */}
                  <div className="p-3 bg-amber-50/30 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-amber-900 block">
                        Prompt Discount ({discountPercent.toFixed(1)}%)
                      </span>
                      <span className="text-[10px] text-amber-700 block">Client early settlement savings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-700 text-sm">
                        -{formatCurrency(discountAmount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(discountAmount.toFixed(2), "discount")}
                        className="p-1 rounded-md hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer"
                        title="Copy Discount Amount"
                      >
                        {isCopied === "discount" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Row 3: Net Remittance Due */}
                  <div className="p-3 bg-blue-50/40 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-blue-950 block">Net Remittance Due</span>
                      <span className="text-[10px] text-blue-700 block">Final payment to disburse</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-blue-600 text-base">
                        {formatCurrency(netPayable)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(netPayable.toFixed(2), "net-ledger")}
                        className="p-1 rounded-md hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer"
                        title="Copy Net Remittance"
                      >
                        {isCopied === "net-ledger" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Formatted Memo Box */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-[11px] font-mono text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Gross Invoice:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(invoiceAmount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Prompt Discount ({discountPercent.toFixed(1)}%):</span>
                    <span className="font-bold">-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-xs">
                    <span>Total Due:</span>
                    <span className="text-blue-600">{formatCurrency(netPayable)}</span>
                  </div>
                </div>

                {/* Copy Full Breakdown Button */}
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
      )}
    </div>
  );
}
