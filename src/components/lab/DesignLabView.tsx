"use client";

import React from "react";
import { FlaskConical, Sparkles } from "lucide-react";

export function DesignLabView() {
  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 sm:pb-4 mb-3 sm:mb-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-fuchsia-600 to-pink-600 text-white flex items-center justify-center shadow-md shadow-fuchsia-500/20 shrink-0">
            <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              Design Lab
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-slate-500 mt-0.5">
              Interactive UI experimentation, layout previews, and component playground
            </p>
          </div>
        </div>

        {/* Experimental Status Badge */}
        <div className="flex items-center shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-600" />
            <span className="hidden sm:inline">Status: </span><span>Clean Canvas</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <FlaskConical className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          Design Lab is Empty
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          The canvas has been cleared. When you want to experiment with new visual components, layouts, or prototype interactions, they will be built here for testing.
        </p>
      </div>
    </div>
  );
}
