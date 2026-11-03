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
  Upload,
  FileText,
  Trash2,
  Loader2,
  Calendar,
  Building2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Save,
  CheckCircle2,
  X,
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

export interface RemittanceItem {
  invoice_number: string;
  invoice_date?: string;
  gross_amount: number;
  discount_amount: number;
  deductions_amount: number;
  net_paid: number;
  notes?: string;
}

export interface RemittanceRecord {
  id?: string;
  vendor_id: string;
  vendor_name: string;
  file_name: string;
  file_size: number;
  total_paid: number;
  total_gross: number;
  total_discount: number;
  total_deductions: number;
  invoice_count: number;
  items: RemittanceItem[];
  raw_text?: string;
  created_at?: string;
  expires_at?: string;
  is_draft?: boolean;
}

export function ResourcesView() {
  // Navigation: "hub" for Resources directory, "discount-calculator" for discount tool, "remittance-breakdown" for remittance tool
  const [currentView, setCurrentView] = useState<"hub" | "discount-calculator" | "remittance-breakdown">("hub");

  // Calculator State (Default $14,080.00 invoice, 4.0% discount)
  const [invoiceInput, setInvoiceInput] = useState<string>("14,080.00");
  const [discountPercent, setDiscountPercent] = useState<number>(4.0);
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Vendor Remittance State
  const [activeVendorTab, setActiveVendorTab] = useState<string>("pyramid");
  const [remittances, setRemittances] = useState<RemittanceRecord[]>([]);
  const [selectedRemittance, setSelectedRemittance] = useState<RemittanceRecord | null>(null);
  const [draftRemittance, setDraftRemittance] = useState<RemittanceRecord | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isLoadingRemittances, setIsLoadingRemittances] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wheel scroll container ref & drag states
  const wheelRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  // Fetch saved remittances for active vendor from Supabase
  const fetchRemittances = useCallback(async (vendorId: string = "pyramid") => {
    setIsLoadingRemittances(true);
    try {
      const res = await fetch(`/api/remittance/parse?vendorId=${vendorId}`);
      const rawText = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        console.warn("Non-JSON response fetching remittances:", rawText);
        return;
      }

      if (json.success && Array.isArray(json.remittances)) {
        setRemittances(json.remittances);
        if (json.remittances.length > 0) {
          setSelectedRemittance((prev) => prev || json.remittances[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load vendor remittances:", err);
    } finally {
      setIsLoadingRemittances(false);
    }
  }, []);

  useEffect(() => {
    if (currentView === "remittance-breakdown") {
      fetchRemittances(activeVendorTab);
    }
  }, [currentView, activeVendorTab, fetchRemittances]);

  // Upload & parse remittance PDF (Parses draft only - does NOT store in database yet)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please select a valid PDF remittance statement.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setSaveSuccessMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("vendorId", activeVendorTab);
    formData.append("vendorName", activeVendorTab === "pyramid" ? "Pyramid Inc" : activeVendorTab);

    try {
      const res = await fetch("/api/remittance/parse", {
        method: "POST",
        body: formData,
      });

      const rawText = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned unexpected response (status ${res.status}): ${rawText.slice(0, 150)}`);
      }

      if (json.success && json.draft) {
        // Present draft for user validation; do not persist to Supabase until confirmed
        setDraftRemittance(json.draft);
        setSelectedRemittance(null); // Focus on validating the new draft
      } else {
        setUploadError(json.error || "Unable to extract table from PDF. Please ensure the document is readable.");
      }
    } catch (err: any) {
      setUploadError(err.message || "Network error uploading statement file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Confirm & Save Validated Remittance to Supabase (Stores data only, NOT the PDF file)
  const handleConfirmAndSave = async () => {
    if (!draftRemittance) return;
    setIsSavingDraft(true);
    setUploadError(null);

    try {
      const res = await fetch("/api/remittance/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remittance: draftRemittance }),
      });

      const rawText = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned error saving record: ${rawText.slice(0, 150)}`);
      }

      if (json.success && json.savedRemittance) {
        setRemittances((prev) => [json.savedRemittance, ...prev]);
        setSelectedRemittance(json.savedRemittance);
        setDraftRemittance(null);
        setSaveSuccessMessage("✓ Statement data confirmed and stored in Supabase for 30 days!");
        setTimeout(() => setSaveSuccessMessage(null), 6000);
      } else {
        setUploadError(json.error || "Failed to save statement to Supabase.");
      }
    } catch (err: any) {
      setUploadError(err.message || "Network error saving statement.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Delete remittance statement from Supabase
  const handleDeleteRemittance = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Permanently remove this remittance record from cloud storage?")) return;

    try {
      const res = await fetch(`/api/remittance/parse?id=${id}`, {
        method: "DELETE",
      });
      const rawText = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        // Ignored
      }
      if (json?.success) {
        setRemittances((prev) => prev.filter((r) => r.id !== id));
        if (selectedRemittance?.id === id) {
          const remaining = remittances.filter((r) => r.id !== id);
          setSelectedRemittance(remaining.length > 0 ? remaining[0] : null);
        }
      }
    } catch (err) {
      console.error("Failed to delete remittance statement:", err);
    }
  };

  // Calculate days remaining before 30-day auto-purge
  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return 30;
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Format remittance summary for Zoho Mail copy-paste
  const handleCopyZohoFormat = (remittance: RemittanceRecord) => {
    const lines = [
      `REMITTANCE STATEMENT SUMMARY - ${remittance.vendor_name.toUpperCase()}`,
      `File: ${remittance.file_name}`,
      `Processed: ${new Date(remittance.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      `==================================================`,
      `TOTAL NET PAID / CLEARED:  $${remittance.total_paid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `TOTAL GROSS INVOICED:      $${remittance.total_gross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `PROMPT DISCOUNTS DEDUCTED: -$${remittance.total_discount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      remittance.total_deductions > 0
        ? `OTHER DEDUCTIONS:          -$${remittance.total_deductions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : null,
      `INVOICES ACCOUNTED:        ${remittance.invoice_count}`,
      `==================================================`,
      `INVOICE BREAKDOWN:`,
      ...(remittance.items && remittance.items.length > 0
        ? remittance.items.map(
            (it, idx) =>
              `${idx + 1}. Inv #${it.invoice_number} | Gross: $${it.gross_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} | Disc: -$${it.discount_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} | Net Paid: $${it.net_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}${it.invoice_date ? ` (${it.invoice_date})` : ""}`
          )
        : ["(See net cleared remittance total above)"]),
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(lines);
    setIsCopied("zoho");
    setTimeout(() => setIsCopied(null), 2500);
  };

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

        {/* Top View Switcher Tabs - Only visible on Hub directory */}
        {currentView === "hub" && (
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentView("hub")}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-white text-slate-900 shadow-xs border border-slate-200/80"
            >
              All Resources (Hub)
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("discount-calculator")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-600 hover:text-slate-900"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Discount Calculator</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("remittance-breakdown")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-600 hover:text-slate-900"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Remittance Breakdown</span>
            </button>
          </div>
        )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
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

            {/* Tool Card 2: Remittance Breakdown */}
            <div
              onClick={() => setCurrentView("remittance-breakdown")}
              className="bg-white rounded-2xl border-2 border-slate-200/90 hover:border-blue-500/80 p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform shadow-xs">
                    <Receipt className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>Workspace Tool</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Remittance Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Vendor remittance calculations, deduction schedules, and payment allocation breakdowns.
                </p>

                {/* Placeholder Calculation Badge */}
                <div className="mt-4 bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-[11px] font-mono text-slate-700 flex items-center justify-between">
                  <span className="text-slate-500">Gross Remittance - Deductions =</span>
                  <span className="font-bold text-blue-600">Net Payable</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Launch Breakdown</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: REMITTANCE BREAKDOWN (Pyramid Inc & Multi-Vendor) */}
      {/* ======================================================== */}
      {currentView === "remittance-breakdown" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Vendor Sub-Tabs Bar (Modular: Pyramid Inc now, expandable to other vendors later) */}
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Vendor:
              </span>
              <button
                type="button"
                onClick={() => setActiveVendorTab("pyramid")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  activeVendorTab === "pyramid"
                    ? "bg-blue-600 text-white shadow-blue-500/20"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Pyramid Inc</span>
              </button>

              <button
                type="button"
                onClick={() => alert("Custom vendor tabs are modular and will be configured in the next update!")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 border border-dashed border-slate-300 hover:text-slate-600 hover:border-slate-400 transition-colors cursor-pointer"
                title="Add custom vendor tab"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Vendor</span>
              </button>
            </div>
          </div>

          {/* Hidden File Input for PDF Upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Active Vendor Card: Pyramid Inc */}
          {activeVendorTab === "pyramid" && (
            <div className="space-y-6">
              {/* Vendor Card Header */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
                    <Building2 className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">
                        Pyramid Inc Remittance Statement
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        <span>Interactive Validation</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                      Upload remittance advice statements from Pyramid Inc. Review and validate the extracted invoice table and discount totals before choosing to save to Supabase.
                    </p>
                  </div>
                </div>

                {/* 30-Day Retention Badge */}
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-3.5 py-2.5 text-xs text-emerald-800 flex items-center gap-2.5 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-[11px] uppercase tracking-wide text-emerald-900">
                      30-Day Supabase Cloud Storage
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      Data only is saved (never the PDF file) upon your confirmation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Notification Banner */}
              {saveSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{saveSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveSuccessMessage(null)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`bg-white rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                  isUploading
                    ? "border-blue-400 bg-blue-50/30 cursor-wait"
                    : "border-slate-300 hover:border-blue-500 hover:bg-slate-50/60 shadow-xs"
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-spin">
                      <Loader2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Extracting Pyramid Inc Remittance Data...
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Extracting invoice numbers, discount percentages, and net bank settlement totals.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs group-hover:scale-105 transition-transform">
                      <Upload className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Click or drag & drop Pyramid Inc remittance PDF here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Extracts invoice line items for your review. The PDF file is not stored in Supabase.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors pointer-events-none"
                    >
                      Browse PDF Document
                    </button>
                  </>
                )}
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-900 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* ======================================================== */}
              {/* STAGE 1: DRAFT VALIDATION VIEW (User confirms before saving) */}
              {/* ======================================================== */}
              {draftRemittance && (
                <div className="space-y-6 bg-gradient-to-b from-blue-50/40 via-white to-white rounded-2xl border-2 border-blue-500/80 p-5 sm:p-7 shadow-lg shadow-blue-500/5 animate-in fade-in duration-200">
                  {/* Validation Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-100">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-slate-900">
                            Validate Remittance Breakdown
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Draft • Unsaved</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                          Statement: <strong className="text-slate-900">{draftRemittance.file_name}</strong>. The PDF file binary itself is <span className="font-bold underline text-slate-900">never stored</span>. Verify that the breakdown below is accurate, then click below to store the extracted data in Supabase for 30 days.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={handleConfirmAndSave}
                        disabled={isSavingDraft}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {isSavingDraft ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving to Supabase...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Confirm & Save to Supabase (30 Days)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftRemittance(null)}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Discard Draft</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Settlement KPI Cards for Draft */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Draft Card 1: Total Net Paid */}
                    <div className="bg-emerald-500 rounded-2xl p-5 text-white shadow-md shadow-emerald-500/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                          Total Net Paid
                        </span>
                        <Receipt className="w-4 h-4 text-emerald-100" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                          {formatCurrency(draftRemittance.total_paid)}
                        </p>
                        <p className="text-[10px] text-emerald-100 font-semibold mt-1">
                          Net bank ACH / Check cleared
                        </p>
                      </div>
                    </div>

                    {/* Draft Card 2: Total Gross Invoiced */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Total Gross Invoiced
                        </span>
                        <DollarSign className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                          {formatCurrency(draftRemittance.total_gross)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          Full invoice face value
                        </p>
                      </div>
                    </div>

                    {/* Draft Card 3: Total Prompt Discount / Deductions */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                          Discounts & Deductions
                        </span>
                        <TrendingDown className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600">
                          -{formatCurrency(draftRemittance.total_discount + draftRemittance.total_deductions)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          {draftRemittance.total_discount > 0 && `Disc: -${formatCurrency(draftRemittance.total_discount)}`}
                          {draftRemittance.total_deductions > 0 && ` | Ded: -${formatCurrency(draftRemittance.total_deductions)}`}
                          {draftRemittance.total_discount === 0 && draftRemittance.total_deductions === 0 && "No prompt deductions"}
                        </p>
                      </div>
                    </div>

                    {/* Draft Card 4: Invoices Count */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Invoices Included
                        </span>
                        <Layers className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                          {draftRemittance.invoice_count}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          Itemized remittance lines
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Draft Invoice Line-Items Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Extracted Invoice Line Items (Review)
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Extracted from statement for your review
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {draftRemittance.items?.length || 0} Records
                      </span>
                    </div>

                    {draftRemittance.items && draftRemittance.items.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="py-3 px-4">Invoice #</th>
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4 text-right">Gross Amount</th>
                              <th className="py-3 px-4 text-right">Prompt Discount</th>
                              <th className="py-3 px-4 text-right">Deductions</th>
                              <th className="py-3 px-4 text-right">Net Paid</th>
                              <th className="py-3 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                            {draftRemittance.items.map((it, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4 font-bold text-blue-600">
                                  {it.invoice_number || `INV-${idx + 1}`}
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-sans">
                                  {it.invoice_date || "—"}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-900">
                                  {formatCurrency(it.gross_amount || 0)}
                                </td>
                                <td className="py-3 px-4 text-right text-amber-600">
                                  {it.discount_amount > 0 ? `-${formatCurrency(it.discount_amount)}` : "—"}
                                </td>
                                <td className="py-3 px-4 text-right text-rose-600">
                                  {it.deductions_amount > 0 ? `-${formatCurrency(it.deductions_amount)}` : "—"}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-emerald-600">
                                  {formatCurrency(it.net_paid || 0)}
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                    Pending Save
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-2">
                        <p className="text-xs font-bold text-slate-700">
                          Summary Settlement Cleared
                        </p>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          The statement provided a total remittance settlement check of{" "}
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(draftRemittance.total_paid)}
                          </span>
                          . Confirm to store this net amount in Supabase.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STAGE 2: CONFIRMED STATEMENT VIEW (Stored in Supabase)   */}
              {/* ======================================================== */}
              {selectedRemittance && !draftRemittance && (
                <div className="space-y-6">
                  {/* Action Bar & Statement Meta */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/80">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">
                            {selectedRemittance.file_name}
                          </h3>
                          {selectedRemittance.created_at && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {new Date(selectedRemittance.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          )}
                          {selectedRemittance.expires_at && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Expires in {getDaysRemaining(selectedRemittance.expires_at)} days</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Stored in Supabase cloud (data only) • Scoped to Pyramid Inc
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Copy for Zoho Mail Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyZohoFormat(selectedRemittance)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                          isCopied === "zoho"
                            ? "bg-emerald-600 text-white"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        title="Copy structured breakdown to paste into Zoho Mail"
                      >
                        {isCopied === "zoho" ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied for Zoho Mail!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy for Zoho Mail</span>
                          </>
                        )}
                      </button>

                      {/* Upload Another Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        Upload Another
                      </button>
                    </div>
                  </div>

                  {/* 4 Summary Settlement KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Net Paid */}
                    <div className="bg-emerald-500 rounded-2xl p-5 text-white shadow-md shadow-emerald-500/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                          Total Net Paid
                        </span>
                        <Receipt className="w-4 h-4 text-emerald-100" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                          {formatCurrency(selectedRemittance.total_paid)}
                        </p>
                        <p className="text-[10px] text-emerald-100 font-semibold mt-1">
                          Net bank ACH / Check cleared
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Total Gross Invoiced */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Total Gross Invoiced
                        </span>
                        <DollarSign className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                          {formatCurrency(selectedRemittance.total_gross)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          Full invoice face value
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Total Prompt Discount / Deductions */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                          Discounts & Deductions
                        </span>
                        <TrendingDown className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600">
                          -{formatCurrency(selectedRemittance.total_discount + selectedRemittance.total_deductions)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          {selectedRemittance.total_discount > 0 && `Disc: -${formatCurrency(selectedRemittance.total_discount)}`}
                          {selectedRemittance.total_deductions > 0 && ` | Ded: -${formatCurrency(selectedRemittance.total_deductions)}`}
                          {selectedRemittance.total_discount === 0 && selectedRemittance.total_deductions === 0 && "No prompt deductions"}
                        </p>
                      </div>
                    </div>

                    {/* Card 4: Invoices Count */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Invoices Included
                        </span>
                        <Layers className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                          {selectedRemittance.invoice_count}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          Itemized remittance lines
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Structured Invoice Line-Items Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Pyramid Inc Invoice Breakdown
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Line items parsed from confirmed statement
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {selectedRemittance.items?.length || 0} Records
                      </span>
                    </div>

                    {selectedRemittance.items && selectedRemittance.items.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="py-3 px-4">Invoice #</th>
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4 text-right">Gross Amount</th>
                              <th className="py-3 px-4 text-right">Prompt Discount</th>
                              <th className="py-3 px-4 text-right">Deductions</th>
                              <th className="py-3 px-4 text-right">Net Paid</th>
                              <th className="py-3 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                            {selectedRemittance.items.map((it, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4 font-bold text-blue-600">
                                  {it.invoice_number || `INV-${idx + 1}`}
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-sans">
                                  {it.invoice_date || "—"}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-900">
                                  {formatCurrency(it.gross_amount || 0)}
                                </td>
                                <td className="py-3 px-4 text-right text-amber-600">
                                  {it.discount_amount > 0 ? `-${formatCurrency(it.discount_amount)}` : "—"}
                                </td>
                                <td className="py-3 px-4 text-right text-rose-600">
                                  {it.deductions_amount > 0 ? `-${formatCurrency(it.deductions_amount)}` : "—"}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-emerald-600">
                                  {formatCurrency(it.net_paid || 0)}
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Reconciled
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-2">
                        <p className="text-xs font-bold text-slate-700">
                          Summary Settlement Cleared
                        </p>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          The statement provided a total remittance settlement check of{" "}
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(selectedRemittance.total_paid)}
                          </span>
                          . Individual invoice rows could not be isolated from the PDF text table.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Historical Statements List (Stored in Supabase for 30 Days) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Pyramid Inc Statement Archive (Supabase 30-Day Window)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Previously uploaded vendor remittances safely saved in Supabase. Auto-prunes after 30 days.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {remittances.length} {remittances.length === 1 ? "Statement" : "Statements"}
                  </span>
                </div>

                {isLoadingRemittances ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Loading saved statements...</span>
                  </div>
                ) : remittances.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No statements uploaded yet for Pyramid Inc. Upload your vendor PDF remittance advice above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {remittances.map((rem) => {
                      const isSelected = selectedRemittance?.id === rem.id;
                      const daysLeft = getDaysRemaining(rem.expires_at);
                      return (
                        <div
                          key={rem.id}
                          onClick={() => setSelectedRemittance(rem)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-50/50 border-blue-500/80 ring-2 ring-blue-500/10"
                              : "bg-slate-50/50 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {rem.file_name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>
                                  {new Date(rem.created_at || Date.now()).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                <span>•</span>
                                <span>{rem.invoice_count} invoices</span>
                                <span>•</span>
                                <span className="font-bold text-amber-600">
                                  {daysLeft}d left
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-black font-mono text-emerald-600">
                              {formatCurrency(rem.total_paid)}
                            </span>
                            {rem.id && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteRemittance(rem.id!, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete from Supabase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: DISCOUNT CALCULATOR (Executive Precision View)     */}
      {/* ======================================================== */}
      {currentView === "discount-calculator" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1">
            <button
              type="button"
              onClick={() => setCurrentView("hub")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <span>← Back to All Resources</span>
            </button>
          </div>
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
