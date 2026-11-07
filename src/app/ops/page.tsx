"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sliders,
  Box,
  Zap,
  Eye,
  Sparkles,
  Activity,
  ArrowRight,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { ZipTabsLogo } from "@/components/ui/ZipTabsLogo";

interface CrestOption {
  id: string;
  label: string;
  icon: any;
  sub: string;
}

const CREST_OPTIONS: CrestOption[] = [
  { id: "electric_bolt", label: "Electric Bolt", icon: Zap, sub: "High Voltage" },
  { id: "cyber_owl", label: "Cyber Owl", icon: Eye, sub: "Night Vision" },
  { id: "obsidian_cube", label: "Obsidian Cube", icon: Box, sub: "Primary Core" },
  { id: "golden_lion", label: "Golden Lion", icon: Sparkles, sub: "Solar Crest" },
  { id: "neon_pulse", label: "Neon Pulse", icon: Activity, sub: "Resonance" },
  { id: "shield_aegis", label: "Shield Aegis", icon: ShieldCheck, sub: "Perimeter" },
];

export default function OpsOverridePage() {
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [clientIp, setClientIp] = useState<string>("Detecting...");
  const [isLockdownActive, setIsLockdownActive] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Challenge Inputs
  const [pinInput, setPinInput] = useState<string>("");
  const [selectedCrest, setSelectedCrest] = useState<string | null>(null);
  const [movieAnswer, setMovieAnswer] = useState<string>("");
  const [sliderValue, setSliderValue] = useState<number>(50);
  const [stepTokens, setStepTokens] = useState<Record<number, string>>({});

  // Initial Status Query
  useEffect(() => {
    fetch("/api/ops/override")
      .then((r) => r.json())
      .then((data) => {
        if (data.clientIp) setClientIp(data.clientIp);
        setIsLockdownActive(Boolean(data.isLockdownActive));
        setIsLocked(Boolean(data.locked));
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
      })
      .catch(() => {});
  }, []);

  // Stage 1: PIN Verification
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit PIN.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ops/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_pin", pin: pinInput }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Authorization failed.");
        if (data.locked) setIsLocked(true);
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
        return;
      }

      setStepTokens((prev) => ({ ...prev, 1: data.token }));
      setCurrentStage(2);
    } catch {
      setErrorMessage("Network error connecting to override gateway.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage 2: Emblem Verification
  const handleVerifyEmblem = async (emblemId: string) => {
    setSelectedCrest(emblemId);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ops/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_emblem",
          token: stepTokens[1],
          emblem: emblemId,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Crest verification failed.");
        if (data.locked) setIsLocked(true);
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
        return;
      }

      setStepTokens((prev) => ({ ...prev, 2: data.token }));
      setCurrentStage(3);
    } catch {
      setErrorMessage("Network error verifying crest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage 3: Question Answer Verification
  const handleVerifyQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieAnswer.trim()) {
      setErrorMessage("Please enter your answer.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ops/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_question",
          token: stepTokens[2],
          answer: movieAnswer,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Clearance verification failed.");
        if (data.locked) setIsLocked(true);
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
        return;
      }

      setStepTokens((prev) => ({ ...prev, 3: data.token }));
      setCurrentStage(4);
    } catch {
      setErrorMessage("Network error verifying clearance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage 4: Slider Calibration & Override Execution
  const handleExecuteOverride = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ops/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_override",
          token: stepTokens[3],
          sliderValue,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Calibration override failed.");
        if (data.locked) setIsLocked(true);
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
        return;
      }

      setIsLockdownActive(false);
      setCurrentStage(5); // Success State
    } catch {
      setErrorMessage("Network error executing emergency override.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setCurrentStage(1);
    setPinInput("");
    setSelectedCrest(null);
    setMovieAnswer("");
    setSliderValue(50);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none relative overflow-hidden">
      {/* Subtle ambient bloom */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/[0.02] blur-[150px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[460px] bg-[#141417] border border-[#26262b] rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#232328] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1c1c21] border border-[#2d2d35] flex items-center justify-center shadow-inner">
              <ZipTabsLogo size="sm" showText={false} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
                  OPS // OVERRIDE
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                  v2.6
                </span>
              </div>
              <h1 className="text-sm font-semibold text-white tracking-tight">
                Emergency State Controller
              </h1>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${
                isLockdownActive
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLockdownActive ? "bg-rose-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              {isLockdownActive ? "LOCKDOWN" : "STANDARD"}
            </span>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="bg-[#1a1a1f] border border-[#282830] rounded-xl p-3 mb-6 text-xs text-zinc-400 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <p className="font-semibold text-zinc-200 text-[11px]">
              Administrative State Override Only
            </p>
            <p className="text-[11px] text-zinc-400">
              This terminal resets the perimeter lockdown state.{" "}
              <strong className="text-zinc-300">No user login sessions or credentials</strong> are
              ever issued from this portal.
            </p>
          </div>
        </div>

        {/* Stage Progress Bar (1 to 4) */}
        {currentStage < 5 && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400">
              <span className="text-zinc-300">
                STAGE {currentStage} OF 4:{" "}
                {currentStage === 1
                  ? "SECURITY PIN"
                  : currentStage === 2
                  ? "MASTER CREST"
                  : currentStage === 3
                  ? "CLEARANCE QUESTION"
                  : "FREQUENCY CALIBRATION"}
              </span>
              <span className="text-zinc-500">{currentStage * 25}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#202026] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${currentStage * 25}%` }}
              />
            </div>
          </div>
        )}

        {/* Lockout Message Banner */}
        {isLocked && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 mb-6 text-center space-y-2">
            <ShieldAlert className="w-7 h-7 text-rose-400 mx-auto" />
            <h2 className="text-sm font-bold text-rose-200">Terminal Locked Out</h2>
            <p className="text-xs text-rose-300">
              Maximum security verification attempts exceeded. Access from this IP (
              <span className="font-mono">{clientIp}</span>) has been blocked for 24 hours.
            </p>
          </div>
        )}

        {/* Dynamic Error Message */}
        {errorMessage && !isLocked && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-5 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STAGE 1: 6-DIGIT PIN */}
        {!isLocked && currentStage === 1 && (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Chief Security PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  disabled={isSubmitting}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="w-full h-12 bg-[#1c1c22] border border-[#2f2f38] focus:border-emerald-400 rounded-xl px-4 text-center font-mono text-xl tracking-[0.4em] text-white outline-hidden transition-all shadow-inner placeholder:tracking-normal placeholder:text-zinc-600"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-2 font-mono text-center">
                Enter your 6-digit cryptographic master PIN
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || pinInput.length !== 6}
              className="w-full h-11 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-bold text-xs tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed shadow-md"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <span>Verify Security PIN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STAGE 2: MASTER CREST EMBLEM */}
        {!isLocked && currentStage === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Challenge 1 of 3: Master Crest
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Select the singular authorized system crest
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {CREST_OPTIONS.map((c) => {
                const IconComponent = c.icon;
                const isSelected = selectedCrest === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleVerifyEmblem(c.id)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-400 text-white shadow-md shadow-emerald-500/10"
                        : "bg-[#1b1b20] border-[#292932] hover:border-[#3c3c48] text-zinc-300 hover:text-white"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-[#24242b] text-zinc-400"
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold tracking-tight text-center truncate w-full">
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {isSubmitting && (
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Verifying cryptographic emblem...</span>
              </div>
            )}
          </div>
        )}

        {/* STAGE 3: SECURITY CLEARANCE QUESTION */}
        {!isLocked && currentStage === 3 && (
          <form onSubmit={handleVerifyQuestion} className="space-y-4">
            <div className="text-center mb-1">
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Challenge 2 of 3: Security Clearance
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Personal authorization prompt verification
              </p>
            </div>

            <div className="bg-[#1c1c22] border border-[#2a2a33] rounded-xl p-3.5 text-center">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">
                Authorized Prompt
              </span>
              <p className="text-xs font-semibold text-zinc-200">
                What&apos;s your fav English movie?
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Secret Response
              </label>
              <input
                type="text"
                autoFocus
                disabled={isSubmitting}
                value={movieAnswer}
                onChange={(e) => setMovieAnswer(e.target.value)}
                placeholder="Enter title..."
                className="w-full h-11 bg-[#1c1c22] border border-[#2f2f38] focus:border-emerald-400 rounded-xl px-4 text-xs text-white outline-hidden transition-all shadow-inner placeholder:text-zinc-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !movieAnswer.trim()}
              className="w-full h-11 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-bold text-xs tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed shadow-md"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <span>Verify Clearance</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STAGE 4: SECRET PERCENTAGE SLIDER */}
        {!isLocked && currentStage === 4 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Challenge 3 of 3: Frequency Calibration
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Calibrate resonance dial to the secret percentage
              </p>
            </div>

            {/* Precision Percentage Readout */}
            <div className="bg-[#1c1c22] border border-[#2d2d38] rounded-xl p-5 text-center space-y-3">
              <span className="text-4xl font-mono font-black text-white tracking-tight">
                {sliderValue}%
              </span>
              <div className="w-full">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={isSubmitting}
                  value={sliderValue}
                  onChange={(e) => setSliderValue(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 h-2 bg-[#262630] rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="bg-[#18181d] border border-[#26262e] rounded-xl p-3 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
              <span>Perimeter Whitelist Target:</span>
              <span className="text-emerald-400 font-semibold">{clientIp}</span>
            </div>

            <button
              type="button"
              onClick={handleExecuteOverride}
              disabled={isSubmitting}
              className="w-full h-12 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-white/5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Executing Override...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-black" />
                  <span>Deactivate Lockdown & Authorize IP</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STAGE 5: SUCCESS CONFIRMATION */}
        {currentStage === 5 && (
          <div className="text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Lockdown Deactivated
              </h2>
              <p className="text-xs text-zinc-400">
                All perimeter restrictions have been removed from Supabase.
              </p>
            </div>

            <div className="bg-[#1b1b20] border border-[#2a2a33] rounded-xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">System Mode:</span>
                <span className="text-emerald-400 font-mono font-bold">Standard Open Access</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Whitelisted IP:</span>
                <span className="text-zinc-200 font-mono">{clientIp}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#262630]">
                <span className="text-zinc-400">Login Session:</span>
                <span className="text-zinc-400 font-mono text-[11px]">None Issued</span>
              </div>
            </div>

            <Link
              href="/"
              className="w-full h-11 bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Proceed to Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Footer Meta */}
        <div className="mt-6 pt-4 border-t border-[#202026] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Client IP: {clientIp}</span>
          {!isLocked && currentStage < 5 && (
            <span>{remainingAttempts} attempt(s) left</span>
          )}
        </div>
      </div>
    </div>
  );
}
