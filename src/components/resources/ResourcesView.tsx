"use client";

import React from "react";
import {
  Calculator,
  Plus,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";

export function ResourcesView() {
  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Resources & Tools
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Calculators, financial models, and workspace utilities for reserve limits and business operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Workspace Utilities</span>
          </span>
        </div>
      </div>

      {/* Planned Utilities Grid Outline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Reserve Limit Calculator (Outline) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <Calculator className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                In Development
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Reserve Limit Calculator
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Calculate safe reserve thresholds, required buffer funds per consultant, and monthly deduction schedules.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>Coming Soon</span>
            </span>
            <span className="text-blue-600 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Card 2: Margin & Rate Estimator (Outline) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Planned
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Margin & Markup Estimator
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Model gross vs net payroll margins across C2C, W2, and 1099 contracts with standard tax and fee deductions.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>Planned</span>
            </span>
            <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Card 3: Custom Tool Placeholder */}
        <div className="bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200 p-5 flex flex-col items-center justify-center text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer min-h-[190px]">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-2.5 shadow-2xs">
            <Plus className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-700">Add New Resource</h4>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
            Link external sheets, custom calculators, or workflow guides here.
          </p>
        </div>
      </div>

      {/* Information Banner */}
      <div className="bg-blue-50/60 rounded-2xl border border-blue-200/80 p-4 sm:p-5 flex items-start gap-3.5">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-blue-950">
            Customizable Resource Hub
          </h4>
          <p className="text-xs text-blue-900/80 mt-1 leading-relaxed">
            This section is reserved for your specialized business tools, reserve limit calculators, and formula sheets. Let us know anytime which specific fields, calculations, or models you’d like active here.
          </p>
        </div>
      </div>
    </div>
  );
}
