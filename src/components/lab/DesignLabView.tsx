"use client";

import React from "react";
import { FlaskConical, Sparkles } from "lucide-react";

export function DesignLabView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
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
  );
}
