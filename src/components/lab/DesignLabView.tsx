"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  Mail,
  Sliders,
  Layers,
  Sparkles,
  ArrowRight,
  Pin,
  Calendar,
  Eye,
  Filter,
  Maximize2,
  ChevronRight,
  X,
  Send,
} from "lucide-react";
import { ExecutiveToast, TOAST_POSITION_CLASSES } from "@/components/ui/ExecutiveToast";

export function DesignLabView() {
  const [activeTab, setActiveTab] = useState<"invoices-kpi" | "email-composer" | "notes-hierarchy" | "margin-badge" | "density">("invoices-kpi");
  const [copiedConcept, setCopiedConcept] = useState<string | null>(null);
  const [densityPreview, setDensityPreview] = useState<"dense" | "comfortable">("comfortable");

  // Email composer draft state
  const [composerVendor, setComposerVendor] = useState("E-Solutions");
  const [composerConsultant, setComposerConsultant] = useState("Suchetha");
  const [composerInvoice, setComposerInvoice] = useState("34125");
  const [composerAmount, setComposerAmount] = useState("$480.00");
  const [composerDays, setComposerDays] = useState("33");

  const showCopyToast = (label: string) => {
    setCopiedConcept(label);
    setTimeout(() => setCopiedConcept(null), 2500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {copiedConcept && (
        <div className={TOAST_POSITION_CLASSES["top-center"]}>
          <ExecutiveToast
            type="success"
            title="Copied to Clipboard"
            description={copiedConcept}
            headerMeta="Design Lab Showcase"
            metric="Copied"
            onClose={() => setCopiedConcept(null)}
            durationMs={2500}
          />
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Design Lab — Visual Proposals for ZipTabs
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Practical visual enhancements designed specifically for your accounting ledger, notes, and remittance workflows. Test how each proposal looks and feels before implementing.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-4 mt-2">
          {[
            { id: "invoices-kpi", label: "1. Invoices Aging KPI Bar" },
            { id: "email-composer", label: "2. One-Click Zoho Statement Composer" },
            { id: "notes-hierarchy", label: "3. Notes Visual Category Spines" },
            { id: "margin-badge", label: "4. Remittance Margin Health Pill" },
            { id: "density", label: "5. Table Density Toggle (Dense vs Cozy)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PROPOSAL 1: INVOICES AGING KPI STRIP                                      */}
      {/* ========================================================================= */}
      {activeTab === "invoices-kpi" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Concept Proposal</div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              Overdue Invoices: Executive Balance Strip & Aging Distribution
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Currently, the Invoices page shows row count and search, but leadership cannot see the total outstanding overdue balance at a glance. Adding this summary bar gives instant financial visibility.
            </p>
          </div>

          {/* Live Component Preview */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Live Preview</div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1">
                <div className="text-[11px] text-slate-400 font-semibold">Total Past Due</div>
                <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-white">$482,410.00</div>
                <div className="text-[10px] text-slate-400">373 total invoices</div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 space-y-1">
                <div className="text-[11px] text-blue-700 font-semibold">1-30 Days Due</div>
                <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-blue-950">$84,120.00</div>
                <div className="text-[10px] text-blue-600">42 invoices (17%)</div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 space-y-1">
                <div className="text-[11px] text-amber-800 font-semibold">31-60 Days Due</div>
                <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-amber-950">$156,800.00</div>
                <div className="text-[10px] text-amber-700">118 invoices (33%)</div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 space-y-1">
                <div className="text-[11px] text-rose-800 font-semibold">60+ Days (Critical)</div>
                <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-rose-950">$241,490.00</div>
                <div className="text-[10px] text-rose-700">213 invoices (50%)</div>
              </div>
            </div>

            {/* Proportional Segmented Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Aging Distribution</span>
                <span>50% Critical (60+ days)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden p-0.5 gap-0.5 border border-slate-200/60">
                <div style={{ width: "17%" }} className="h-full bg-blue-500 rounded-l-full" title="1-30 Days: 17%" />
                <div style={{ width: "33%" }} className="h-full bg-amber-500" title="31-60 Days: 33%" />
                <div style={{ width: "50%" }} className="h-full bg-rose-500 rounded-r-full" title="60+ Days: 50%" />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>1-30 Days</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>31-60 Days</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>60+ Days</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROPOSAL 2: ONE-CLICK ZOHO EMAIL STATEMENT COMPOSER                       */}
      {/* ========================================================================= */}
      {activeTab === "email-composer" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Concept Proposal</div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              One-Click Zoho Statement Composer (Subject + Greeting + Table)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Currently, copying only copies the table rows. The user still has to manually type the email subject and greeting in Zoho Mail. This drawer generates the complete ready-to-paste email draft in 1 click.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Interactive Controls (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
              <div className="text-xs font-bold text-slate-900 pb-1 border-b border-slate-100">
                Sample Record Selector
              </div>

              {[
                { vendor: "E-Solutions", consultant: "Suchetha", invoice: "34125", amount: "$480.00", days: "33" },
                { vendor: "Centraprise", consultant: "Yashwanth Reddy", invoice: "31044", amount: "$7,200.00", days: "24" },
                { vendor: "Diverse Lynx", consultant: "Prathyusha", invoice: "34210", amount: "$8,493.00", days: "19" },
              ].map((item) => (
                <div
                  key={item.invoice}
                  onClick={() => {
                    setComposerVendor(item.vendor);
                    setComposerConsultant(item.consultant);
                    setComposerInvoice(item.invoice);
                    setComposerAmount(item.amount);
                    setComposerDays(item.days);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                    composerInvoice === item.invoice
                      ? "bg-blue-50/80 border-blue-400 text-blue-950 font-bold"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.vendor} - {item.consultant}</span>
                    <span className="font-mono">{item.amount}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Email Draft Preview (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Zoho Mail Output Preview</span>
                </div>
                <button
                  type="button"
                  onClick={() => showCopyToast("Full email draft (Subject, Greeting & Table) copied!")}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Entire Email</span>
                </button>
              </div>

              {/* Subject */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800">
                <span className="text-slate-400 font-bold select-none">Subject: </span>
                Statement of Overdue Invoices — {composerVendor} ({composerConsultant})
              </div>

              {/* Body Greeting */}
              <div className="text-xs text-slate-700 leading-relaxed space-y-2">
                <p>Hi {composerVendor} Accounts Team,</p>
                <p>
                  I hope this email finds you well. Please review the overdue statement below regarding consultant <strong>{composerConsultant}</strong>. Let us know the expected remittance date at your earliest convenience.
                </p>
              </div>

              {/* Exact #0070C0 Table */}
              <div className="overflow-x-auto">
                <table
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    borderCollapse: "collapse",
                    border: "1px solid #000000",
                    fontFamily: "Calibri, Arial, sans-serif",
                    fontSize: "13px",
                    width: "100%",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "left" }}>
                        Consultant
                      </th>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        Invoice
                      </th>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "right" }}>
                        Amount Due
                      </th>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        Due Date
                      </th>
                      <th style={{ backgroundColor: "#0070C0", color: "#FFFFFF", fontWeight: "bold", padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        Aging
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "left" }}>
                        {composerConsultant}
                      </td>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        {composerInvoice}
                      </td>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "right", fontWeight: "bold" }}>
                        {composerAmount}
                      </td>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "center" }}>
                        10/03/2026
                      </td>
                      <td style={{ padding: "6px 12px", border: "1px solid #000000", textAlign: "center", fontWeight: "bold" }}>
                        {composerDays}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-slate-700 pt-2">
                <p>Thank you,<br />Accounts Receivable</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROPOSAL 3: NOTES VISUAL CATEGORY SPINES                                  */}
      {/* ========================================================================= */}
      {activeTab === "notes-hierarchy" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Concept Proposal</div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              Quick Notes: Visual Category Spines & Pinned Priority Shelf
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Currently, note cards all have identical white borders, making it hard to visually distinguish QuickBooks entries from Payroll updates or Urgent notes. Category color spines make scanning 3x faster.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: QuickBooks with Emerald Spine */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 border-l-4 border-l-emerald-500 shadow-sm space-y-2 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Quickbooks
                </span>
                <span className="text-[11px] text-slate-400">2d ago</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Invoices not marked in Leopard</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                1. Invoice # 34390 - ArtNet - Praneeth (10/28/2026)<br />
                2. Invoice # 34385 - Corp Brok - Geethika (in QB also)
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </span>
                <span>2 attachments</span>
              </div>
            </div>

            {/* Card 2: Payroll with Violet Spine */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 border-l-4 border-l-violet-500 shadow-sm space-y-2 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                  Payroll
                </span>
                <span className="text-[11px] text-slate-400">13d ago</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Payroll Updates — Oct Run</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Verified gross pay calculation across all active consultants with wire submission logs.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </span>
                <span>1 attachment</span>
              </div>
            </div>

            {/* Card 3: Quick Notes with Amber Spine */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 border-l-4 border-l-amber-500 shadow-sm space-y-2 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Quick Notes
                </span>
                <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Add Jesualdo Reserve</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Add 6k to Jesualdo Reserve account for pending USCIS processing fees.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </span>
                <span>0 attachments</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROPOSAL 4: REMITTANCE MARGIN HEALTH PILL                                */}
      {/* ========================================================================= */}
      {activeTab === "margin-badge" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Concept Proposal</div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              Resources & Remittances: Instant Margin & Profitability Indicator
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              When verifying vendor remittances against billing rates, accounting must calculate hourly spreads manually. This indicator automatically color-codes profitability so low-margin accounts are spotted immediately.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
            <div className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
              Sample Remittance Table with Margin Health
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Consultant</th>
                    <th className="py-2.5 px-3">Client Bill Rate</th>
                    <th className="py-2.5 px-3">Vendor Pay Rate</th>
                    <th className="py-2.5 px-3">Hourly Margin</th>
                    <th className="py-2.5 px-3">Margin Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">Suchetha (E-Solutions)</td>
                    <td className="py-3 px-3 font-mono">$85.00/hr</td>
                    <td className="py-3 px-3 font-mono">$65.00/hr</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">+$20.00/hr (23.5%)</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Healthy Margin
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">Yashwanth Reddy (Centraprise)</td>
                    <td className="py-3 px-3 font-mono">$75.00/hr</td>
                    <td className="py-3 px-3 font-mono">$66.00/hr</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">+$9.00/hr (12.0%)</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" /> Moderate ($9/hr)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">Mohana Latha Pattapu (Skill Logic)</td>
                    <td className="py-3 px-3 font-mono">$70.00/hr</td>
                    <td className="py-3 px-3 font-mono">$67.00/hr</td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-700">+$3.00/hr (4.2%)</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3" /> Low Margin Alert
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROPOSAL 5: DENSITY SWITCHER (COMPACT LEDGER VS COZY)                     */}
      {/* ========================================================================= */}
      {activeTab === "density" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Concept Proposal</div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                Table Density Switcher: Dense Excel Mode vs Comfortable
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                For PC users working on large desktop monitors who want to review 50+ rows at once without scrolling.
              </p>
            </div>
            <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => setDensityPreview("dense")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  densityPreview === "dense" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dense (Excel 32px)
              </button>
              <button
                type="button"
                onClick={() => setDensityPreview("comfortable")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  densityPreview === "comfortable" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Comfortable (52px)
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className={`px-4 ${densityPreview === "dense" ? "py-1.5" : "py-3"}`}>Vendor</th>
                  <th className={`px-4 ${densityPreview === "dense" ? "py-1.5" : "py-3"}`}>Invoice</th>
                  <th className={`px-4 ${densityPreview === "dense" ? "py-1.5" : "py-3"}`}>Amount Due</th>
                  <th className={`px-4 ${densityPreview === "dense" ? "py-1.5" : "py-3"}`}>Due Date</th>
                  <th className={`px-4 ${densityPreview === "dense" ? "py-1.5" : "py-3"}`}>Aging</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { v: "E-Solutions - Suchetha", inv: "34125", amt: "$480.00", due: "10/03/2026", age: 33 },
                  { v: "Centraprise-Yashwanth Reddy", inv: "31044", amt: "$7,200.00", due: "10/12/2026", age: 24 },
                  { v: "Diverse Lynx - Prathyusha", inv: "34210", amt: "$8,493.00", due: "10/24/2026", age: 12 },
                  { v: "Corporate Brokers-Geethika", inv: "33890", amt: "$6,100.00", due: "10/28/2026", age: 8 },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition">
                    <td className={`px-4 font-bold text-slate-900 ${densityPreview === "dense" ? "py-1.5 text-[11px]" : "py-3"}`}>
                      {row.v}
                    </td>
                    <td className={`px-4 font-mono text-slate-700 ${densityPreview === "dense" ? "py-1.5 text-[11px]" : "py-3"}`}>
                      #{row.inv}
                    </td>
                    <td className={`px-4 font-mono font-bold text-slate-900 ${densityPreview === "dense" ? "py-1.5 text-[11px]" : "py-3"}`}>
                      {row.amt}
                    </td>
                    <td className={`px-4 text-slate-600 ${densityPreview === "dense" ? "py-1.5 text-[11px]" : "py-3"}`}>
                      {row.due}
                    </td>
                    <td className={`px-4 font-mono font-bold text-slate-900 ${densityPreview === "dense" ? "py-1.5 text-[11px]" : "py-3"}`}>
                      {row.age}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
