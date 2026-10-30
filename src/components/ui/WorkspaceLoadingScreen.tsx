"use client";

import React from "react";

export function WorkspaceLoadingScreen() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] relative flex flex-col items-center justify-center overflow-hidden font-sans select-none animate-in fade-in duration-300">
      {/* Soft Ambient Radial Accents Matching Workspace Palette */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"
        style={{ transform: "translate3d(0,0,0)" }}
      />
      <div 
        className="absolute w-[320px] h-[320px] rounded-full bg-slate-200/40 blur-[70px] pointer-events-none -top-10"
        style={{ transform: "translate3d(0,0,0)" }}
      />

      {/* Center Branded Loader Pod */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Brand Squircle with Orbital Progress Ring */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Subtle Outer Halo */}
          <div className="absolute inset-0 rounded-2xl bg-blue-500/10 blur-md animate-pulse" />

          {/* SVG Smooth Rotating Orbital Ring (Light Slate Track + Blue Accent) */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 animate-spin"
            style={{ animationDuration: "2.2s" }}
            viewBox="0 0 80 80"
          >
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="#e2e8f0"
              strokeWidth="2.5"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="url(#blueOrbitalGradient)"
              strokeWidth="2.5"
              strokeDasharray="65 150"
              strokeLinecap="round"
              fill="none"
            />
            <defs>
              <linearGradient id="blueOrbitalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>

          {/* ZipTabs Squircle Icon Core */}
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center shadow-lg shadow-blue-500/10 z-10 relative">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 drop-shadow-2xs"
            >
              {/* Back tab (muted slate) */}
              <path
                d="M7 11C7 9.89543 7.89543 9 9 9H15L18 12H23C24.1046 12 25 12.8954 25 14V20C25 21.1046 24.1046 22 23 22H9C7.89543 22 7 21.1046 7 20V11Z"
                fill="#94a3b8"
                fillOpacity="0.75"
              />
              {/* Front tab (high-contrast dark graphite) */}
              <path
                d="M9 13C9 11.8954 9.89543 11 11 11H17L20 14H24C25.1046 14 26 14.8954 26 16V22C26 23.1046 25.1046 24 24 24H11C9.89543 24 9 23.1046 9 22V13Z"
                fill="#0f172a"
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
        <div className="mt-5 flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-slate-900">ZipTabs</span>
          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/70">
            WORKSPACE
          </span>
        </div>

        {/* Status Pill Badge */}
        <div className="mt-3 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse ring-2 ring-blue-500/20" />
          <span>Securing workspace session...</span>
        </div>

        {/* Micro Laser Shimmer Progress Track */}
        <div className="mt-4 w-36 h-1 bg-slate-200/80 rounded-full overflow-hidden relative shadow-inner">
          <div className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-blue-600 to-transparent animate-shimmer-laser" />
        </div>
      </div>
    </div>
  );
}
