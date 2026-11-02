"use client";

import React from "react";
import { Sparkles, Layers, CheckCircle2 } from "lucide-react";

export function DesignLabView() {
  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
      {/* Primary Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold tracking-wider mb-2 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>DESIGN LAB // EXPERIMENTAL STUDIO</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            UI Design Explorations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Workspace is currently running on the default architectural standard.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold self-start sm:self-center shadow-2xs">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Standard Active</span>
        </div>
      </div>

      {/* Empty State Canvas */}
      <div className="rounded-3xl border border-dashed border-slate-200/90 bg-white/70 backdrop-blur-sm p-8 sm:p-16 flex flex-col items-center justify-center text-center shadow-2xs min-h-[380px]">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
          <CheckCircle2 className="w-7 h-7 text-blue-600 stroke-[2.2]" />
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
          No Active Experiments
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md leading-relaxed">
          The workspace has returned to its clean default layout. New component prototypes and layout experiments will appear here when ready for testing.
        </p>
      </div>
    </div>
  );
}
