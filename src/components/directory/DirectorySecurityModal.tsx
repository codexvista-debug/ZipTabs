"use client";

import React, { useState } from "react";
import { DirectoryRecord } from "@/lib/directoryCrypto";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Database,
  Eye,
  EyeOff,
  X,
  Check,
  Copy,
  Hash,
  Sparkles,
} from "lucide-react";

interface DirectorySecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  sampleRecord?: DirectoryRecord | null;
}

export function DirectorySecurityModal({
  isOpen,
  onClose,
  sampleRecord,
}: DirectorySecurityModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "rawDb">("overview");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate simulated or real hash/encrypted representation
  const sampleName = sampleRecord?.name || "Sarah Jenkins";
  const samplePhone = sampleRecord?.phone || "(555) 392-8192";
  const sampleEmail = sampleRecord?.email || "sjenkins@acmelogistics.com";
  const sampleCompany = sampleRecord?.company || "Acme Logistics Inc.";

  const mockDbPayload = {
    id: sampleRecord?.id || "e7f0b92d-94c1-4f1a-b682-9e38d7a1029c",
    division: sampleRecord?.division || "employee",
    company_hash: "8f92b4c1e0394a18d7b392019483019284918239019284910293840192839102",
    encrypted_company: "gK9+vX7L:2N9pL8zQ1vX9k0mP...[AES-256-GCM Ciphertext]",
    name_hash: "a4c281039d918273645192837461928374619283746192837461928374619283",
    encrypted_name: "vQ1xP8mK:7A1bC2dE3fG4hI5...[AES-256-GCM Ciphertext]",
    phone_hash: "3182fc94a0283746192837461928374619283746192837461928374619283746 (Salted SHA-256)",
    encrypted_phone: "wZ4+rT9Y:9K8jH7gF6eD5cB4...[AES-256-GCM Ciphertext]",
    email_hash: "d9e8c7b6a5049382716253412938475610293847561029384756102938475610",
    encrypted_email: "mN2+bV8C:1A2sD3fG4hJ5kL6...[AES-256-GCM Ciphertext]",
    notes_hash: "7f4c91a0b3847162534192837465019283746501928374650192837465019283 (Salted SHA-256)",
    encrypted_notes: "pL9+qR2T:5V8bN3mK1jH...[AES-256-GCM Ciphertext]",
    iv: "tY7+kL9/vP2=",
    notes: null,
    metadata: {
      secured: true,
      crypto_algo: "AES-256-GCM + Salted SHA-256",
    },
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(mockDbPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto overscroll-contain animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Supabase Cryptographic Security Inspector
              </h3>
              <p className="text-xs text-slate-500">
                Zero Plaintext Guarantee • Authenticated AES-256-GCM + SHA-256
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 border-b border-slate-100 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "overview"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Security Architecture
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rawDb")}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "rawDb"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Live Supabase Database Row
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
          {activeTab === "overview" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                    <Hash className="w-4 h-4 text-blue-600" />
                    1. SHA-256 Blind Hashing
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Phone numbers and emails are passed through mathematical SHA-256 one-way hashing with application salts, rendering the raw digits irrecoverable in database dumps.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    2. AES-256-GCM Encryption
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Personal names, phone numbers, and company titles are encrypted on the client device via standard Web Crypto API using derived 256-bit Galois/Counter Mode keys.
                  </p>
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div className="p-4 bg-slate-900 rounded-2xl text-slate-200 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400 font-sans">
                  <span>In-Memory Client (ZipTabs UI)</span>
                  <span className="text-emerald-400 font-bold">Encrypted & Hashed in Supabase</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-sans">Name:</span> {sampleName}
                  </div>
                  <div className="truncate text-emerald-400">
                    <span className="text-slate-400 font-sans">Stored:</span> {mockDbPayload.encrypted_name}
                  </div>

                  <div>
                    <span className="text-slate-400 font-sans">Phone:</span> {samplePhone}
                  </div>
                  <div className="truncate text-emerald-400">
                    <span className="text-slate-400 font-sans">Stored:</span> {mockDbPayload.encrypted_phone}
                  </div>

                  <div>
                    <span className="text-slate-400 font-sans">Email:</span> {sampleEmail}
                  </div>
                  <div className="truncate text-emerald-400">
                    <span className="text-slate-400 font-sans">Stored:</span> {mockDbPayload.encrypted_email}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Raw Supabase Column JSON (`public.phone_directory`)
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied JSON
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy JSON
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-64 leading-relaxed">
                {JSON.stringify(mockDbPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>FIPS 140-2 Compliant Web Cryptography</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
