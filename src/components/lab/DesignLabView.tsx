"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
  Maximize2,
  Smartphone,
  Monitor,
  RotateCcw,
  Zap,
  Activity,
  Layers,
} from "lucide-react";
import { WorkspaceLoadingScreen } from "@/components/ui/WorkspaceLoadingScreen";

export function DesignLabView() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(42);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [deviceFrame, setDeviceFrame] = useState<"desktop" | "mobile">("desktop");

  // Progress simulation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + 2;
        });
      }, 120);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-28 animate-in fade-in duration-200">
      {/* Full Screen Live Preview Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[9999] bg-white">
          <WorkspaceLoadingScreen
            progress={progress}
            isInteractivePreview={true}
            onExitPreview={() => setIsFullScreen(false)}
          />
        </div>
      )}

      {/* Primary Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wider mb-2 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>DESIGN LAB // PRODUCTION MOTION SUITE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            HyperDrive Bento Loading Suite
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            The permanent, high-performance loading screen for ZipTabs. Engineered in a clean, luminous light-mode aesthetic with dual kinetic gyro rings and live telemetry chips.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active: <strong className="text-blue-600 uppercase">HyperDrive Bento</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Screen Preview</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage & Frame */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Stage Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              OFFICIAL LOADER
            </span>
            <span className="text-xs font-bold text-slate-800">HyperDrive Bento (Light Mode)</span>
            <span className="text-xs text-slate-400 hidden md:inline">• Dual Gyro Rings + Telemetry Bento</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Progress Simulation Toggle */}
            <button
              type="button"
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSimulating
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-blue-600" />}
              <span>{isSimulating ? "Pause Progress" : "Simulate 0-100%"}</span>
            </button>

            {/* Reset Progress */}
            <button
              type="button"
              onClick={() => setProgress(42)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Reset progress to 42%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Device Viewport Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setDeviceFrame("desktop")}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  deviceFrame === "desktop"
                    ? "bg-white text-blue-600 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Desktop widescreen frame"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceFrame("mobile")}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  deviceFrame === "mobile"
                    ? "bg-white text-blue-600 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Mobile smartphone frame"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Canvas Viewport */}
        <div className="p-3 sm:p-6 bg-slate-100/70 flex items-center justify-center min-h-[440px]">
          <div
            className={`transition-all duration-300 overflow-hidden shadow-2xl rounded-3xl border border-slate-200/90 ${
              deviceFrame === "mobile"
                ? "w-[340px] h-[580px] max-w-full"
                : "w-full h-[460px] max-w-4xl"
            }`}
          >
            <WorkspaceLoadingScreen
              progress={progress}
              isInteractivePreview={true}
            />
          </div>
        </div>
      </div>

      {/* Feature & Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
            <Sparkles className="w-4 h-4" />
            <span>Light Mode Aesthetic</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Transitioned from pitch-black dark mode to a clean, cohesive light mode with soft ambient radial glows and crisp slate typography that blends seamlessly with the rest of ZipTabs.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <Activity className="w-4 h-4" />
            <span>Kinetic Gyro Prisms</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Hardware-accelerated CSS GPU primitives (<code className="text-slate-800 font-mono text-[11px]">transform: rotate</code>, <code className="text-slate-800 font-mono text-[11px]">opacity</code>) driving counter-rotating rings at a locked 60 FPS.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
            <CheckCircle2 className="w-4 h-4" />
            <span>Telemetry Bento Pods</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Real-time visual telemetry tracking Database synchronization, AES-256 encrypted authentication, and sub-20ms network latency.
          </p>
        </div>
      </div>
    </div>
  );
}
