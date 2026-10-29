"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Calculator,
  Percent,
  Copy,
  Check,
  RotateCcw,
  DollarSign,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Info,
  Sliders,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";

// Standard prefilled discount percentage options
const PREFILLED_DISCOUNTS = [1, 2, 2.5, 3, 4, 5, 7.5, 10, 12, 15, 20];

// Common invoice preset amounts
const PRESET_AMOUNTS = [1000, 5000, 10000, 14080, 25000, 50000];

// Dial percentage points for the Dus Ka Dum style scroll wheel (0% to 100%)
const WHEEL_TICKS = Array.from({ length: 101 }, (_, i) => i);

export function ResourcesView() {
  const [activeTab, setActiveTab] = useState<"discount">("discount");

  // Calculator State
  // Default to $14,080 and 4% matching the user's example
  const [invoiceInput, setInvoiceInput] = useState<string>("14080");
  const [discountPercent, setDiscountPercent] = useState<number>(4);
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Wheel scroll container ref
  const wheelRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);

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

  // Step percentage up or down
  const adjustPercent = (delta: number) => {
    setDiscountPercent((prev) => {
      const next = Math.min(100, Math.max(0, parseFloat((prev + delta).toFixed(2))));
      return next;
    });
  };

  // Synchronize the Dus Ka Dum wheel position when discount percent changes
  useEffect(() => {
    if (!wheelRef.current) return;
    const rounded = Math.round(discountPercent);
    const targetEl = document.getElementById(`wheel-tick-${rounded}`);
    if (targetEl && wheelRef.current) {
      targetEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [discountPercent]);

  // Handle horizontal mousewheel scrolling on the Dus Ka Dum wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (wheelRef.current) {
      wheelRef.current.scrollLeft += e.deltaY;
    }
  };

  // Mouse drag to scroll wheel
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

  // Reset to default
  const handleReset = () => {
    setInvoiceInput("14080");
    setDiscountPercent(4);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header & Tab Navigation */}
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
              Financial calculation models, prompt discount estimators, and net remittance tools.
            </p>
          </div>
        </div>

        {/* Tab Selector: Discount Calculator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("discount")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              activeTab === "discount"
                ? "bg-blue-600 text-white shadow-blue-500/20"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Discount Calculator</span>
            <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-extrabold">
              Active
            </span>
          </button>
        </div>
      </div>

      {/* Main Calculator Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Inputs: Invoice Amount + Dus Ka Dum Wheel) - 7 cols */}
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

          {/* 2. Discount Percentage Card with "Dus Ka Dum" Style Interactive Wheel */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4">
            {/* Header: Title + Numerical Badge + Stepper */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-blue-600" />
                  <span>Discount Percentage</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scroll or drag the percentage wheel, choose a preset, or type manually.
                </p>
              </div>

              {/* Big Percentage Badge & Steppers */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustPercent(-1)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Minus 1%"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-mono font-black text-base sm:text-lg min-w-[70px] text-center shadow-xs">
                  {discountPercent}%
                </div>
                <button
                  type="button"
                  onClick={() => adjustPercent(1)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Plus 1%"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* DUS KA DUM STYLE INTERACTIVE SCROLL WHEEL / DIAL */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-1">
                <span>0% Wheel Dial</span>
                <span className="text-blue-600 font-extrabold flex items-center gap-1">
                  <span>← Swipe / Scroll Wheel →</span>
                </span>
                <span>100%</span>
              </div>

              {/* Wheel Container with Center Needle Pointer */}
              <div className="relative bg-slate-900 rounded-2xl p-3 shadow-inner overflow-hidden border border-slate-800 select-none">
                {/* Center Indicator Line & Triangle Pointer */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 pointer-events-none z-20 flex flex-col items-center justify-between">
                  {/* Top Pointer */}
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.8)]" />
                  {/* Center Vertical Needle */}
                  <div className="w-[2px] h-full bg-gradient-to-b from-amber-400 via-amber-300 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] opacity-90" />
                  {/* Bottom Pointer */}
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-amber-400 drop-shadow-[0_-2px_4px_rgba(251,191,36,0.8)]" />
                </div>

                {/* Left & Right Shadow Vignette for Depth */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10" />

                {/* Scrollable Dial Track */}
                <div
                  ref={wheelRef}
                  onWheel={handleWheelScroll}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseLeaveOrUp}
                  onMouseLeave={handleMouseLeaveOrUp}
                  onMouseMove={handleMouseMove}
                  className="flex items-center gap-3 overflow-x-auto py-3 px-[48%] cursor-grab active:cursor-grabbing no-scrollbar scrollbar-none"
                  style={{ scrollBehavior: "smooth" }}
                >
                  {WHEEL_TICKS.map((num) => {
                    const isSelected = Math.round(discountPercent) === num;
                    const isMajor = num % 5 === 0;

                    return (
                      <button
                        key={num}
                        id={`wheel-tick-${num}`}
                        type="button"
                        onClick={() => setDiscountPercent(num)}
                        className={`flex flex-col items-center shrink-0 transition-all cursor-pointer group ${
                          isSelected
                            ? "scale-125 z-10 text-amber-300"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {/* Tick Mark */}
                        <div
                          className={`rounded-full transition-all ${
                            isSelected
                              ? "w-1 h-6 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                              : isMajor
                              ? "w-[2px] h-4 bg-slate-600 group-hover:bg-slate-400"
                              : "w-[1px] h-2 bg-slate-700 group-hover:bg-slate-500"
                          }`}
                        />
                        {/* Number Display for Major Ticks or Selected */}
                        {(isMajor || isSelected) && (
                          <span
                            className={`text-[10px] mt-1 font-mono font-bold tracking-tighter ${
                              isSelected
                                ? "text-amber-300 font-black text-xs"
                                : "text-slate-500"
                            }`}
                          >
                            {num}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Smooth Range Slider */}
              <div className="mt-3 px-1">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="0.25"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>0%</span>
                  <span>10%</span>
                  <span>20%</span>
                  <span>30%</span>
                  <span>40%</span>
                  <span>50%</span>
                </div>
              </div>
            </div>

            {/* Quick Prefilled Option Pills */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Prefilled Percentages:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PREFILLED_DISCOUNTS.map((pct) => {
                  const isCurrent = discountPercent === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(pct)}
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

        {/* Right Column (Results: Final Net Amount, Discount Deduction, Formula Breakdown) - 5 cols */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Net Amount Card (Prominent & High-Impact) */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-blue-500/15 relative overflow-hidden">
            {/* Top background accent glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-100/90 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-blue-200" />
                  <span>Net Payable (After Discount)</span>
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                  Final Due
                </span>
              </div>

              {/* Giant Net Amount */}
              <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight font-mono text-white mt-1 drop-shadow-sm">
                {formatCurrency(netPayable)}
              </div>

              <p className="text-xs text-blue-100/80 mt-2 font-medium">
                Calculated as <span className="font-bold text-white">{formatCurrency(invoiceAmount)}</span> minus{" "}
                <span className="font-bold text-amber-300">{formatCurrency(discountAmount)}</span> ({discountPercent}% discount).
              </p>

              {/* Copy Net Amount Button */}
              <button
                type="button"
                onClick={() => handleCopy(netPayable.toFixed(2), "net")}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold transition-all shadow-md shadow-black/10 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isCopied === "net" ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-extrabold">Copied Net Amount!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-blue-600" />
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

            {/* Two Stat Boxes */}
            <div className="grid grid-cols-2 gap-3">
              {/* Discount Deduction Box */}
              <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/80">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Discount Deduction ({discountPercent}%)
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-amber-700 mt-1 block">
                  -{formatCurrency(discountAmount)}
                </span>
                <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">
                  Client Savings
                </span>
              </div>

              {/* Original Invoice Total Box */}
              <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Gross Invoice Amount
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-slate-800 mt-1 block">
                  {formatCurrency(invoiceAmount)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                  Before Discount
                </span>
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
                <span>Prompt Discount ({discountPercent}%):</span>
                <span className="font-bold">-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="pt-1 border-t border-slate-200/80 flex justify-between font-bold text-slate-900 text-xs">
                <span>Total Due:</span>
                <span className="text-blue-600">{formatCurrency(netPayable)}</span>
              </div>
            </div>

            {/* Action Buttons: Copy Full Breakdown & Reset */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const memoText = `Invoice Amount: ${formatCurrency(invoiceAmount)}\nDiscount (${discountPercent}%): -${formatCurrency(discountAmount)}\nNet Payable: ${formatCurrency(netPayable)}`;
                  handleCopy(memoText, "memo");
                }}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                {isCopied === "memo" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied Breakdown!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Full Memo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
                title="Reset to default ($14,080 / 4%)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
