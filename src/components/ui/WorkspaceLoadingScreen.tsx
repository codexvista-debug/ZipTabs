"use client";

import React from "react";

export function WorkspaceLoadingScreen() {
  return (
    <div className="min-h-screen w-full bg-[#080d1a] relative flex flex-col items-center justify-center overflow-hidden font-sans select-none animate-in fade-in duration-300">
      {/* Soft Ambient Radial Glow Behind Centerpiece */}
      <div 
        className="absolute w-[440px] h-[440px] rounded-full bg-blue-600/10 blur-[90px] pointer-events-none"
        style={{ transform: "translate3d(0,0,0)" }}
      />
      <div 
        className="absolute w-[280px] h-[280px] rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none -top-12"
        style={{ transform: "translate3d(0,0,0)" }}
      />

      {/* Center Branded Loader Pod */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Brand Squircle with Orbital Progress Ring */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Outer Breathing Aura Halo */}
          <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-md animate-pulse" />

          {/* SVG Smooth Rotating Orbital Ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 animate-spin"
            style={{ animationDuration: "2.4s" }}
            viewBox="0 0 80 80"
          >
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="#1e293b"
              strokeWidth="2.5"
              fill="none"
              opacity="0.6"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="url(#orbitalGradient)"
              strokeWidth="2.5"
              strokeDasharray="65 150"
              strokeLinecap="round"
              fill="none"
            />
            <defs>
              <linearGradient id="orbitalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>

          {/* ZipTabs Squircle Icon Core */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800 to-[#0c1427] border border-slate-700/80 flex items-center justify-center shadow-xl shadow-black/60 z-10 relative">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 drop-shadow-sm"
            >
              {/* Back tab (muted slate) */}
              <path
                d="M7 11C7 9.89543 7.89543 9 9 9H15L18 12H23C24.1046 12 25 12.8954 25 14V20C25 21.1046 24.1046 22 23 22H9C7.89543 22 7 21.1046 7 20V11Z"
                fill="#64748b"
                fillOpacity="0.7"
              />
              {/* Front tab (crisp white) */}
              <path
                d="M9 13C9 11.8954 9.89543 11 11 11H17L20 14H24C25.1046 14 26 14.8954 26 16V22C26 23.1046 25.1046 24 24 24H11C9.89543 24 9 23.1046 9 22V13Z"
                fill="#f8fafc"
              />
              {/* Lightning / Fast "Z" notch (vibrant blue) */}
              <path
                d="M19 14.5L14 18.5H17.5L15 22.5L20 18.5H16.8L19 14.5Z"
                fill="#2563eb"
              />
            </svg>
          </div>
        </div>

        {/* Brand Title */}
        <div className="mt-5 flex items-center gap-1.5">
          <span className="text-lg font-black tracking-tight text-white">ZipTabs</span>
          <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
            WORKSPACE
          </span>
        </div>

        {/* Status Pill Badge */}
        <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-medium text-slate-300 shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Securing workspace session...</span>
        </div>

        {/* Micro Laser Shimmer Progress Track */}
        <div className="mt-4 w-36 h-0.5 bg-slate-800/80 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-shimmer-laser" />
        </div>
      </div>
    </div>
  );
}
