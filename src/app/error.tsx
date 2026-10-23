"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for diagnostic tracking
    console.error("ZipTabs application runtime error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="max-w-md w-full bg-[#0c1427] border border-[#1b2b4d] rounded-2xl p-6 sm:p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-white tracking-tight">Something went wrong</h1>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          {error?.message || "An unexpected issue occurred while rendering this view. You can retry or return to your dashboard."}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
