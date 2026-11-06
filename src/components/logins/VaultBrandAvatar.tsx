"use client";

import React, { useState, useMemo } from "react";
import { Check, Dices, Sparkles, RefreshCw } from "lucide-react";

export interface VaultIconItem {
  id: string;
  name: string;
  category: "app" | "brand" | "symbol" | "fintech" | "tools" | "security";
  bgGradient: string;
  borderClass: string;
  accentColor: string;
  badgeBg: string;
  keywords: string[];
  renderSvg: (className?: string) => React.ReactNode;
  // Compatibility fields for legacy references
  variantNumber: 1 | 2 | 3;
  familyId: string;
  familyName: string;
  label: string;
  themeName: string;
}

// 54+ High-contrast, iconic app/product emblems inspired by Android launcher icon packs
export const VAULT_ICONS: VaultIconItem[] = [
  // 1. Threads / Spiral
  {
    id: "threads",
    name: "Threads Loop",
    category: "app",
    bgGradient: "from-zinc-900 to-black",
    borderClass: "border-zinc-700/80 shadow-black/20",
    accentColor: "#FFFFFF",
    badgeBg: "bg-zinc-800 text-white",
    keywords: ["threads", "meta", "social", "loop", "spiral"],
    variantNumber: 1,
    familyId: "threads",
    familyName: "Threads",
    label: "Threads Loop",
    themeName: "Obsidian",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#000000" />
        <path
          d="M20 11C15 11 11 15 11 20C11 25 15 29 20 29C23.5 29 26.5 27 27.8 24.2C27.2 23.8 26.5 23.5 25.8 23.2C24.8 25.2 22.5 26.8 20 26.8C16.2 26.8 13.2 23.8 13.2 20C13.2 16.2 16.2 13.2 20 13.2C23.8 13.2 26.8 16.2 26.8 20V21.5C26.8 22.6 25.9 23.5 24.8 23.5C23.7 23.5 22.8 22.6 22.8 21.5V17.5C22.8 15.5 21.2 14 19.2 14C17.2 14 15.7 15.6 15.7 17.5V22.2C15.7 24.2 17.2 25.8 19.2 25.8C20.8 25.8 22.1 24.8 22.6 23.3C23.2 24.5 24.4 25.2 25.8 25.2C27.5 25.2 29 23.7 29 22V20C29 15 25 11 20 11Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },

  // 2. Electric Lightning Bolt
  {
    id: "lightning",
    name: "Electric Bolt",
    category: "symbol",
    bgGradient: "from-cyan-400 to-blue-600",
    borderClass: "border-cyan-300/80 shadow-cyan-500/20",
    accentColor: "#06B6D4",
    badgeBg: "bg-cyan-700 text-white",
    keywords: ["lightning", "bolt", "electric", "power", "energy", "fast", "speed"],
    variantNumber: 1,
    familyId: "lightning",
    familyName: "Lightning",
    label: "Electric Bolt",
    themeName: "Cyan Energy",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#06B6D4" />
        <path d="M22 8L11 22H20L18 32L29 18H20L22 8Z" fill="#FFFFFF" stroke="#0891B2" strokeWidth="1" />
      </svg>
    ),
  },

  // 3. Tumblr 't'
  {
    id: "tumblr",
    name: "Royal 't'",
    category: "brand",
    bgGradient: "from-blue-600 to-indigo-900",
    borderClass: "border-blue-400/80 shadow-blue-500/20",
    accentColor: "#3B82F6",
    badgeBg: "bg-blue-800 text-white",
    keywords: ["tumblr", "t", "letter", "royal", "blue"],
    variantNumber: 1,
    familyId: "tumblr",
    familyName: "Tumblr",
    label: "Royal 't'",
    themeName: "Royal Blue",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#001935" />
        <path
          d="M24 26C22.8 26 21.8 25.5 21.8 23.5V17.5H25V14H21.8V10H18.2C18 11.5 17 14 15 14.8V17.5H17V24C17 27.5 19.5 29.5 23.2 29.5C24.5 29.5 25.8 29.2 26.5 28.5L25.5 25.5C25 25.8 24.5 26 24 26Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },

  // 4. Tick / Checkmark Circle
  {
    id: "tickmark",
    name: "Tick Circle",
    category: "tools",
    bgGradient: "from-white to-slate-100",
    borderClass: "border-blue-400 shadow-blue-500/10",
    accentColor: "#F97316",
    badgeBg: "bg-blue-600 text-white",
    keywords: ["tick", "check", "todo", "done", "task", "ticktick"],
    variantNumber: 1,
    familyId: "tickmark",
    familyName: "Tickmark",
    label: "Tick Circle",
    themeName: "Clean Task",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2.5" />
        <path d="M14 20.5L18 24.5L26 15.5" stroke="#F97316" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  // 5. TikTok Neon Note
  {
    id: "tiktok",
    name: "Neon Rhythm",
    category: "app",
    bgGradient: "from-slate-900 to-black",
    borderClass: "border-pink-500/40 shadow-pink-500/20",
    accentColor: "#EC4899",
    badgeBg: "bg-black text-pink-400",
    keywords: ["tiktok", "video", "music", "neon", "rhythm"],
    variantNumber: 1,
    familyId: "tiktok",
    familyName: "TikTok",
    label: "Neon Rhythm",
    themeName: "Cyberpunk",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#000000" />
        {/* Cyan shadow */}
        <path
          d="M25 12C26.2 13.8 28.2 15 30 15.2V18.2C27.8 18 26 17.2 24.8 16V24.5C24.8 27.5 22.2 30 19 30C16 30 13.5 27.5 13.5 24.5C13.5 21.5 16 19 19 19C19.5 19 20 19.1 20.5 19.2V22.2C20 22.1 19.5 22 19 22C17.6 22 16.5 23.1 16.5 24.5C16.5 25.9 17.6 27 19 27C20.4 27 21.8 25.9 21.8 24.5V10H25V12Z"
          fill="#06B6D4"
          transform="translate(-1, 0)"
        />
        {/* Pink shadow */}
        <path
          d="M25 12C26.2 13.8 28.2 15 30 15.2V18.2C27.8 18 26 17.2 24.8 16V24.5C24.8 27.5 22.2 30 19 30C16 30 13.5 27.5 13.5 24.5C13.5 21.5 16 19 19 19C19.5 19 20 19.1 20.5 19.2V22.2C20 22.1 19.5 22 19 22C17.6 22 16.5 23.1 16.5 24.5C16.5 25.9 17.6 27 19 27C20.4 27 21.8 25.9 21.8 24.5V10H25V12Z"
          fill="#EC4899"
          transform="translate(1, 0)"
        />
        {/* White main */}
        <path
          d="M25 12C26.2 13.8 28.2 15 30 15.2V18.2C27.8 18 26 17.2 24.8 16V24.5C24.8 27.5 22.2 30 19 30C16 30 13.5 27.5 13.5 24.5C13.5 21.5 16 19 19 19C19.5 19 20 19.1 20.5 19.2V22.2C20 22.1 19.5 22 19 22C17.6 22 16.5 23.1 16.5 24.5C16.5 25.9 17.6 27 19 27C20.4 27 21.8 25.9 21.8 24.5V10H25V12Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },

  // 6. Water Droplet
  {
    id: "waterdrop",
    name: "Aqua Droplet",
    category: "symbol",
    bgGradient: "from-slate-100 to-white",
    borderClass: "border-slate-300 shadow-slate-400/20",
    accentColor: "#334155",
    badgeBg: "bg-slate-800 text-white",
    keywords: ["water", "drop", "droplet", "clean", "aqua", "fluid", "pure"],
    variantNumber: 1,
    familyId: "waterdrop",
    familyName: "Waterdrop",
    label: "Aqua Droplet",
    themeName: "Mineral",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
        <path d="M20 10C20 10 13 19 13 23.5C13 27.4 16.1 30 20 30C23.9 30 27 27.4 27 23.5C27 19 20 10 20 10Z" fill="#334155" />
      </svg>
    ),
  },

  // 7. Thermometer / Caliper Gauge
  {
    id: "thermometer",
    name: "Mercury Caliper",
    category: "tools",
    bgGradient: "from-zinc-950 to-black",
    borderClass: "border-blue-500/50 shadow-blue-500/15",
    accentColor: "#38BDF8",
    badgeBg: "bg-blue-900 text-blue-100",
    keywords: ["thermometer", "temperature", "gauge", "measure", "caliper", "sensor"],
    variantNumber: 1,
    familyId: "thermometer",
    familyName: "Thermometer",
    label: "Mercury Caliper",
    themeName: "Precision",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#09090B" />
        <path d="M19 10C17.9 10 17 10.9 17 12V22.2C15.2 23.3 14 25.3 14 27.5C14 30.8 16.7 33.5 20 33.5C23.3 33.5 26 30.8 26 27.5C26 25.3 24.8 23.3 23 22.2V12C23 10.9 22.1 10 21 10H19Z" stroke="#38BDF8" strokeWidth="1.8" />
        <circle cx="20" cy="27.5" r="3.5" fill="#38BDF8" />
        <line x1="20" y1="16" x2="20" y2="25" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="14" r="0.8" fill="#F59E0B" />
        <circle cx="24" cy="17" r="0.8" fill="#F59E0B" />
        <circle cx="24" cy="20" r="0.8" fill="#F59E0B" />
      </svg>
    ),
  },

  // 8. Tim Hortons Coffee Cup
  {
    id: "timhortons",
    name: "Scarlet Brew",
    category: "brand",
    bgGradient: "from-rose-500 to-red-700",
    borderClass: "border-red-400 shadow-red-600/20",
    accentColor: "#DC2626",
    badgeBg: "bg-red-800 text-white",
    keywords: ["coffee", "cup", "brew", "tim", "hortons", "cafe", "red"],
    variantNumber: 1,
    familyId: "timhortons",
    familyName: "Brew",
    label: "Scarlet Brew",
    themeName: "Scarlet",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#FFFFFF" />
        <path d="M14 14L16 29H24L26 14H14Z" fill="#DC2626" />
        <rect x="13" y="12" width="14" height="3" rx="1.5" fill="#B91C1C" />
        <path d="M16 20C17.5 19 22.5 19 24 20" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },

  // 9. Document Task Sync
  {
    id: "document",
    name: "Doc Sync",
    category: "tools",
    bgGradient: "from-sky-400 to-blue-600",
    borderClass: "border-sky-300 shadow-sky-500/20",
    accentColor: "#0284C7",
    badgeBg: "bg-sky-800 text-white",
    keywords: ["document", "file", "sync", "refresh", "records", "notes"],
    variantNumber: 1,
    familyId: "document",
    familyName: "Document",
    label: "Doc Sync",
    themeName: "Azure",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#0284C7" />
        <rect x="12" y="11" width="14" height="18" rx="2" fill="#FFFFFF" />
        <line x1="15" y1="15" x2="23" y2="15" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="18" x2="23" y2="18" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="21" x2="20" y2="21" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="5" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
        <path d="M22.5 24L23.5 25L25.5 23" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  // 10. Yellow Signpost Trail
  {
    id: "signpost",
    name: "Trail Signpost",
    category: "symbol",
    bgGradient: "from-white to-slate-50",
    borderClass: "border-amber-300 shadow-amber-400/20",
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-600 text-white",
    keywords: ["signpost", "guide", "direction", "navigation", "trail", "way"],
    variantNumber: 1,
    familyId: "signpost",
    familyName: "Signpost",
    label: "Trail Signpost",
    themeName: "Golden Way",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        <rect x="19" y="10" width="2" height="20" fill="#334155" />
        <path d="M12 14H24L26 16.5L24 19H12V14Z" fill="#FBBF24" />
        <path d="M28 20H16L14 22.5L16 25H28V20Z" fill="#F59E0B" />
      </svg>
    ),
  },

  // 11. Fiery Flame / Phoenix
  {
    id: "flame",
    name: "Blaze Flame",
    category: "symbol",
    bgGradient: "from-red-500 to-rose-700",
    borderClass: "border-rose-400 shadow-rose-500/20",
    accentColor: "#E11D48",
    badgeBg: "bg-red-800 text-white",
    keywords: ["flame", "fire", "hot", "blaze", "burn", "phoenix", "urgent"],
    variantNumber: 1,
    familyId: "flame",
    familyName: "Flame",
    label: "Blaze Flame",
    themeName: "Inferno",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#E11D48" />
        <path
          d="M20 9C20 9 23 14 23 17C23 15 25 14 25 14C25 14 28 18 28 22C28 26.4 24.4 30 20 30C15.6 30 12 26.4 12 22C12 17 16 13 18 11C18 13 19 14.5 19 16C19 13 20 9 20 9Z"
          fill="#FFFFFF"
        />
        <path d="M20 22C19 22 17.5 23 17.5 24.5C17.5 26 18.5 27.5 20 27.5C21.5 27.5 22.5 26 22.5 24.5C22.5 23 21 22 20 22Z" fill="#FBBF24" />
      </svg>
    ),
  },

  // 12. Touching Hand Tap Target
  {
    id: "handtap",
    name: "Touch Target",
    category: "tools",
    bgGradient: "from-blue-500 to-indigo-700",
    borderClass: "border-blue-400 shadow-blue-500/20",
    accentColor: "#2563EB",
    badgeBg: "bg-blue-800 text-white",
    keywords: ["touch", "hand", "tap", "click", "interact", "pointer"],
    variantNumber: 1,
    familyId: "handtap",
    familyName: "Handtap",
    label: "Touch Target",
    themeName: "Cobalt Touch",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#2563EB" />
        <circle cx="20" cy="16" r="4.5" stroke="#93C5FD" strokeWidth="1.2" strokeDasharray="2 2" />
        <path d="M19 14V22.5L16.5 20.5C15.8 19.8 14.7 20 14.2 20.8C13.8 21.5 14 22.5 14.8 23.2L18.5 27.5C19.5 28.5 20.8 29 22.2 29H25C27.2 29 29 27.2 29 25V20C29 19.2 28.3 18.5 27.5 18.5C27.3 18.5 27 18.6 26.8 18.7C26.5 18 25.8 17.5 25 17.5C24.7 17.5 24.5 17.6 24.2 17.7C23.9 17 23.2 16.5 22.5 16.5C22.2 16.5 22 16.6 21.8 16.7V14C21.8 13.2 21.1 12.5 20.3 12.5C19.6 12.5 19 13.2 19 14Z" fill="#FFFFFF" />
      </svg>
    ),
  },

  // 13. Briefcase Vault
  {
    id: "briefcase",
    name: "Emerald Suitcase",
    category: "fintech",
    bgGradient: "from-teal-400 to-emerald-600",
    borderClass: "border-teal-300 shadow-teal-500/20",
    accentColor: "#0D9488",
    badgeBg: "bg-teal-800 text-white",
    keywords: ["briefcase", "portfolio", "business", "suitcase", "office", "work"],
    variantNumber: 1,
    familyId: "briefcase",
    familyName: "Briefcase",
    label: "Emerald Suitcase",
    themeName: "Teal Office",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#0D9488" />
        <rect x="11" y="16" width="18" height="13" rx="2.5" fill="#FFFFFF" />
        <path d="M16 16V13C16 12.4 16.4 12 17 12H23C23.6 12 24 12.4 24 13V16" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 18V24M20 24L17.5 21.5M20 24L22.5 21.5" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  // 14. Shield with Lightning
  {
    id: "shieldbolt",
    name: "Shield Voltage",
    category: "security",
    bgGradient: "from-emerald-500 to-green-700",
    borderClass: "border-emerald-400 shadow-emerald-500/20",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-800 text-white",
    keywords: ["shield", "security", "bolt", "safe", "firewall", "defense", "protect"],
    variantNumber: 1,
    familyId: "shieldbolt",
    familyName: "Shieldbolt",
    label: "Shield Voltage",
    themeName: "Emerald Guard",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#10B981" />
        <path d="M20 10L28 13.5V20C28 25.5 24.5 29 20 30.5C15.5 29 12 25.5 12 20V13.5L20 10Z" fill="#047857" />
        <path d="M21 14L16 21H20L19 26L24 19H20L21 14Z" fill="#FFFFFF" />
      </svg>
    ),
  },

  // 15. Sunburst Gear
  {
    id: "sunburst",
    name: "Solar Gear",
    category: "symbol",
    bgGradient: "from-amber-400 to-orange-600",
    borderClass: "border-amber-300 shadow-amber-500/20",
    accentColor: "#F59E0B",
    badgeBg: "bg-orange-700 text-white",
    keywords: ["sun", "gear", "burst", "solar", "warm", "orange", "energy"],
    variantNumber: 1,
    familyId: "sunburst",
    familyName: "Sunburst",
    label: "Solar Gear",
    themeName: "Amber Sun",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#F97316" />
        <circle cx="20" cy="20" r="6" fill="#FFFFFF" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect
            key={i}
            x="19"
            y="10"
            width="2"
            height="3"
            rx="1"
            fill="#FFFFFF"
            transform={`rotate(${angle} 20 20)`}
          />
        ))}
      </svg>
    ),
  },

  // 16. Ace of Spades Ornate
  {
    id: "aceofspades",
    name: "Spade Ace",
    category: "brand",
    bgGradient: "from-slate-900 to-indigo-950",
    borderClass: "border-amber-400/80 shadow-amber-500/15",
    accentColor: "#F59E0B",
    badgeBg: "bg-slate-900 text-amber-300",
    keywords: ["spade", "ace", "card", "play", "vip", "gold", "elite"],
    variantNumber: 1,
    familyId: "aceofspades",
    familyName: "Ace",
    label: "Spade Ace",
    themeName: "Royal Velvet",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
        <path
          d="M20 11C20 11 13 18.5 13 22C13 24.5 15 26.5 17.5 26.5C19 26.5 20 25.5 20 25.5C20 25.5 21 26.5 22.5 26.5C25 26.5 27 24.5 27 22C27 18.5 20 11 20 11Z"
          fill="#F59E0B"
        />
        <path d="M18.5 25.5L16.5 29H23.5L21.5 25.5" fill="#F59E0B" />
      </svg>
    ),
  },

  // 17. Code Tag Brackets
  {
    id: "codebracket",
    name: "Dev Terminal",
    category: "tools",
    bgGradient: "from-blue-600 to-indigo-700",
    borderClass: "border-blue-400 shadow-blue-500/20",
    accentColor: "#3B82F6",
    badgeBg: "bg-indigo-800 text-white",
    keywords: ["code", "dev", "bracket", "developer", "api", "tech", "software"],
    variantNumber: 1,
    familyId: "codebracket",
    familyName: "Code",
    label: "Dev Terminal",
    themeName: "Electric Code",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#2563EB" />
        <path d="M16 15L11 20L16 25" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 15L29 20L24 25" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="22" y1="13" x2="18" y2="27" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },

  // 18. Acorn Emblem
  {
    id: "acorn",
    name: "Forest Acorn",
    category: "symbol",
    bgGradient: "from-green-500 to-emerald-700",
    borderClass: "border-green-400 shadow-green-500/20",
    accentColor: "#22C55E",
    badgeBg: "bg-green-800 text-white",
    keywords: ["acorn", "seed", "nature", "growth", "invest", "oak", "green"],
    variantNumber: 1,
    familyId: "acorn",
    familyName: "Acorn",
    label: "Forest Acorn",
    themeName: "Forest Green",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#16A34A" />
        <path d="M14 17C14 15 16.5 13 20 13C23.5 13 26 15 26 17H14Z" fill="#FFFFFF" />
        <path d="M20 10V13" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M14.5 18C14.5 24 20 28 20 28C20 28 25.5 24 25.5 18H14.5Z" fill="#DCFCE7" />
      </svg>
    ),
  },

  // 19. Red Arrow Rocket
  {
    id: "redarrow",
    name: "Red Compass",
    category: "symbol",
    bgGradient: "from-rose-500 to-red-600",
    borderClass: "border-rose-400 shadow-rose-500/20",
    accentColor: "#E11D48",
    badgeBg: "bg-rose-800 text-white",
    keywords: ["arrow", "rocket", "compass", "red", "direction", "up", "launch"],
    variantNumber: 1,
    familyId: "redarrow",
    familyName: "Redarrow",
    label: "Red Compass",
    themeName: "Crimson Arrow",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#E11D48" />
        <path d="M20 11L13 26L20 22L27 26L20 11Z" fill="#FFFFFF" />
      </svg>
    ),
  },

  // 20. Ukrainian Diia
  {
    id: "diia",
    name: "Diia Sovereign",
    category: "brand",
    bgGradient: "from-zinc-950 to-black",
    borderClass: "border-zinc-700 shadow-black/20",
    accentColor: "#FFFFFF",
    badgeBg: "bg-zinc-800 text-white",
    keywords: ["diia", "gov", "identity", "sovereign", "minimal", "black"],
    variantNumber: 1,
    familyId: "diia",
    familyName: "Diia",
    label: "Diia Sovereign",
    themeName: "Monochrome",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#000000" />
        <text x="20" y="25" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="900" fontSize="13">
          Дія
        </text>
      </svg>
    ),
  },

  // 21. Smiling Cube Avatar
  {
    id: "smilebox",
    name: "Happy Cube",
    category: "app",
    bgGradient: "from-emerald-300 to-teal-500",
    borderClass: "border-teal-300 shadow-teal-500/20",
    accentColor: "#14B8A6",
    badgeBg: "bg-teal-700 text-white",
    keywords: ["smile", "cube", "happy", "box", "character", "avatar", "fun"],
    variantNumber: 1,
    familyId: "smilebox",
    familyName: "Smilebox",
    label: "Happy Cube",
    themeName: "Pastel Mint",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#CCFBF1" />
        <rect x="13" y="13" width="14" height="14" rx="3" fill="#14B8A6" />
        <circle cx="17" cy="18" r="1.5" fill="#FFFFFF" />
        <circle cx="23" cy="18" r="1.5" fill="#FFFFFF" />
        <path d="M17 22C17 22 18.5 24 20 24C21.5 24 23 22 23 22" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },

  // 22. Wave Pulse Audio
  {
    id: "wavecurve",
    name: "Sine Rhythm",
    category: "symbol",
    bgGradient: "from-fuchsia-500 via-purple-600 to-indigo-700",
    borderClass: "border-fuchsia-400 shadow-fuchsia-500/20",
    accentColor: "#D946EF",
    badgeBg: "bg-purple-900 text-white",
    keywords: ["wave", "sine", "pulse", "audio", "gradient", "fuchsia", "purple"],
    variantNumber: 1,
    familyId: "wavecurve",
    familyName: "Wave",
    label: "Sine Rhythm",
    themeName: "Neon Pulse",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#A855F7" />
        <path
          d="M13 25C13 25 15 15 18 15C21 15 22 25 25 25C27 25 28 20 28 20"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },

  // 23. Layered Portal Rectangles
  {
    id: "layeredportal",
    name: "Multi-Portal",
    category: "fintech",
    bgGradient: "from-blue-500 to-sky-600",
    borderClass: "border-sky-300 shadow-blue-500/20",
    accentColor: "#0284C7",
    badgeBg: "bg-blue-800 text-white",
    keywords: ["portal", "layer", "stack", "cards", "interface", "workspace", "sl"],
    variantNumber: 1,
    familyId: "layeredportal",
    familyName: "Portal",
    label: "Multi-Portal",
    themeName: "Ocean Layer",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#0284C7" />
        <rect x="13" y="13" width="14" height="14" rx="3" fill="#FFFFFF" fillOpacity="0.4" />
        <rect x="16" y="16" width="14" height="14" rx="3" fill="#FFFFFF" />
      </svg>
    ),
  },

  // 24. Canary Yellow 'a'
  {
    id: "canarya",
    name: "Canary Alpha",
    category: "brand",
    bgGradient: "from-amber-300 via-amber-400 to-yellow-500",
    borderClass: "border-yellow-200 shadow-amber-400/25",
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-700 text-white",
    keywords: ["a", "canary", "alpha", "letter", "yellow", "gold"],
    variantNumber: 1,
    familyId: "canarya",
    familyName: "Canary",
    label: "Canary Alpha",
    themeName: "Solar Gold",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#F59E0B" />
        <text x="20" y="27" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="900" fontSize="18">
          a
        </text>
      </svg>
    ),
  },

  // 25. Target Concentric Rings
  {
    id: "targetring",
    name: "Cyan Bullseye",
    category: "symbol",
    bgGradient: "from-cyan-400 to-sky-600",
    borderClass: "border-cyan-300 shadow-cyan-500/20",
    accentColor: "#06B6D4",
    badgeBg: "bg-cyan-800 text-white",
    keywords: ["target", "bullseye", "ring", "focus", "goal", "accuracy"],
    variantNumber: 1,
    familyId: "targetring",
    familyName: "Target",
    label: "Cyan Bullseye",
    themeName: "Starlight Ring",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#06B6D4" />
        <circle cx="20" cy="20" r="9" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="20" cy="20" r="3.5" fill="#FFFFFF" />
      </svg>
    ),
  },

  // 26. Dove in Flight
  {
    id: "dove",
    name: "White Dove",
    category: "symbol",
    bgGradient: "from-rose-600 to-red-700",
    borderClass: "border-rose-400 shadow-rose-600/20",
    accentColor: "#E11D48",
    badgeBg: "bg-rose-900 text-white",
    keywords: ["dove", "bird", "peace", "fly", "freedom", "flight", "red"],
    variantNumber: 1,
    familyId: "dove",
    familyName: "Dove",
    label: "White Dove",
    themeName: "Peace Scarlet",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#DC2626" />
        <path
          d="M27 15C25 15 22 17 21 19C19 18 16 18 14 20C12 22 13 25 15 25C17 25 18 24 19 23L19 26L21 27L22 24C24 24 26 23 27 21C28 19 28 16 27 15Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },

  // 27. Security Shield Check
  {
    id: "shieldcheck",
    name: "Vault Guardian",
    category: "security",
    bgGradient: "from-emerald-400 to-green-600",
    borderClass: "border-emerald-300 shadow-emerald-500/20",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-800 text-white",
    keywords: ["shield", "check", "secure", "verified", "safe", "guard", "security"],
    variantNumber: 1,
    familyId: "shieldcheck",
    familyName: "Shieldcheck",
    label: "Vault Guardian",
    themeName: "Verified Green",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#10B981" />
        <path d="M20 10L27 13.5V20C27 25 24 28.5 20 30C16 28.5 13 25 13 20V13.5L20 10Z" fill="#059669" />
        <path d="M17 19.5L19 21.5L23.5 17" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  // 28. Discord Blurple Gamepad
  {
    id: "discord",
    name: "Discord Controller",
    category: "app",
    bgGradient: "from-indigo-500 to-[#5865F2]",
    borderClass: "border-indigo-400 shadow-indigo-500/20",
    accentColor: "#5865F2",
    badgeBg: "bg-indigo-900 text-white",
    keywords: ["discord", "bot", "chat", "gaming", "community", "voice"],
    variantNumber: 1,
    familyId: "discord",
    familyName: "Discord",
    label: "Discord Controller",
    themeName: "Blurple",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#5865F2" />
        <path
          d="M26.5 14C24.8 13.2 23.2 12.8 21.5 12.5C21.3 12.9 21.1 13.4 20.9 13.8C19.2 13.5 17.5 13.5 15.8 13.8C15.6 13.4 15.4 12.9 15.2 12.5C13.5 12.8 11.8 13.3 10.2 14C7 18.8 6.1 23.5 6.5 28.1C8.7 29.7 10.7 30.7 12.8 31.4C13.3 30.7 13.7 29.9 14.1 29.1C13.3 28.8 12.6 28.4 12 27.9C12.2 27.7 12.4 27.5 12.6 27.3C16.5 29.1 20.8 29.1 24.7 27.3C24.9 27.5 25.1 27.7 25.3 27.9C24.7 28.4 24 28.8 23.2 29.1C23.6 29.9 24.1 30.7 24.6 31.4C26.6 30.7 28.7 29.7 30.8 28.1C31.3 22.8 29.9 18.2 26.5 14ZM14.5 24C13.4 24 12.5 23 12.5 21.8C12.5 20.5 13.4 19.5 14.5 19.5C15.6 19.5 16.5 20.5 16.5 21.8C16.5 23 15.6 24 14.5 24ZM22.5 24C21.4 24 20.5 23 20.5 21.8C20.5 20.5 21.4 19.5 22.5 19.5C23.6 19.5 24.5 20.5 24.5 21.8C24.5 23 23.6 24 22.5 24Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },

  // 29. Slack Aubergine
  {
    id: "slack",
    name: "Slack Hash",
    category: "app",
    bgGradient: "from-purple-900 to-[#4A154B]",
    borderClass: "border-purple-500 shadow-purple-900/30",
    accentColor: "#E01E5A",
    badgeBg: "bg-purple-950 text-white",
    keywords: ["slack", "team", "chat", "workspace", "channel"],
    variantNumber: 1,
    familyId: "slack",
    familyName: "Slack",
    label: "Slack Hash",
    themeName: "Aubergine",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#4A154B" />
        <rect x="13" y="18" width="6" height="3" rx="1.5" fill="#36C5F0" />
        <rect x="18" y="13" width="3" height="6" rx="1.5" fill="#2EB67D" />
        <rect x="21" y="18" width="6" height="3" rx="1.5" fill="#ECB22E" />
        <rect x="18" y="21" width="3" height="6" rx="1.5" fill="#E01E5A" />
      </svg>
    ),
  },

  // 30. Stripe S
  {
    id: "stripe",
    name: "Stripe Pay",
    category: "fintech",
    bgGradient: "from-indigo-600 to-[#635BFF]",
    borderClass: "border-indigo-400 shadow-indigo-500/20",
    accentColor: "#635BFF",
    badgeBg: "bg-indigo-950 text-white",
    keywords: ["stripe", "payment", "checkout", "money", "card", "billing"],
    variantNumber: 1,
    familyId: "stripe",
    familyName: "Stripe",
    label: "Stripe Pay",
    themeName: "Stripe Indigo",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#635BFF" />
        <path
          d="M23 16.5C23 15.5 22 14.8 20.2 14.8C18.5 14.8 17.2 15.3 16.5 15.8L15.8 13.5C16.8 13 18.5 12.5 20.5 12.5C24.5 12.5 26.5 14.5 26.5 17.5C26.5 21.8 20.8 22.2 20.8 23.8C20.8 24.8 21.8 25.2 23.2 25.2C24.8 25.2 26.2 24.8 27 24.2L27.5 26.5C26.5 27.2 24.5 27.8 22.5 27.8C18.5 27.8 16.8 25.5 16.8 22.8C16.8 18.5 23 18 23 16.5Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },

  // 31. QuickBooks Green
  {
    id: "quickbooks",
    name: "QuickBooks Ledger",
    category: "fintech",
    bgGradient: "from-green-500 to-[#2CA01C]",
    borderClass: "border-green-400 shadow-green-500/20",
    accentColor: "#2CA01C",
    badgeBg: "bg-green-800 text-white",
    keywords: ["quickbooks", "intuit", "accounting", "ledger", "payroll", "qb"],
    variantNumber: 1,
    familyId: "quickbooks",
    familyName: "QuickBooks",
    label: "QuickBooks Ledger",
    themeName: "Intuit Green",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#2CA01C" />
        <circle cx="16" cy="20" r="5" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        <path d="M16 15V25" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="20" r="5" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        <path d="M24 15V25" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },

  // 32. AWS Cloud Smile
  {
    id: "aws",
    name: "AWS Cloud",
    category: "brand",
    bgGradient: "from-slate-800 to-[#232F3E]",
    borderClass: "border-amber-500/50 shadow-amber-500/10",
    accentColor: "#FF9900",
    badgeBg: "bg-slate-900 text-amber-400",
    keywords: ["aws", "amazon", "cloud", "server", "infra", "hosting"],
    variantNumber: 1,
    familyId: "aws",
    familyName: "AWS",
    label: "AWS Cloud",
    themeName: "Amazon Dark",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#232F3E" />
        <text x="20" y="20" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="900" fontSize="10">
          aws
        </text>
        <path d="M14 23C17 26 23 26 26 23" stroke="#FF9900" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M26 21.5L27 23.5L25 24" fill="#FF9900" />
      </svg>
    ),
  },

  // 33. Google Four-Color G
  {
    id: "google",
    name: "Google Quad",
    category: "brand",
    bgGradient: "from-white to-slate-100",
    borderClass: "border-slate-300 shadow-slate-400/20",
    accentColor: "#4285F4",
    badgeBg: "bg-blue-600 text-white",
    keywords: ["google", "gmail", "search", "alphabet", "drive", "workspace"],
    variantNumber: 1,
    familyId: "google",
    familyName: "Google",
    label: "Google Quad",
    themeName: "Google Colors",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <path d="M27.5 20.2C27.5 19.5 27.4 18.8 27.3 18.2H20V21.8H24.3C24.1 22.8 23.5 23.8 22.5 24.4V26.5H25.3C27 24.9 27.5 22.7 27.5 20.2Z" fill="#4285F4" />
        <path d="M20 28C22.2 28 24 27.2 25.3 26.5L22.5 24.4C21.8 24.8 21 25.1 20 25.1C17.9 25.1 16.2 23.7 15.6 21.8H12.7V24H12.7C14.1 26.5 16.9 28 20 28Z" fill="#34A853" />
        <path d="M15.6 21.8C15.4 21.2 15.3 20.6 15.3 20C15.3 19.4 15.4 18.8 15.6 18.2V16H12.7C12.1 17.2 11.8 18.6 11.8 20C11.8 21.4 12.1 22.8 12.7 24L15.6 21.8Z" fill="#FBBC05" />
        <path d="M20 14.9C21.2 14.9 22.3 15.3 23.2 16.1L25.4 13.9C24 12.6 22.2 11.8 20 11.8C16.9 11.8 14.1 13.5 12.7 16L15.6 18.2C16.2 16.3 17.9 14.9 20 14.9Z" fill="#EA4335" />
      </svg>
    ),
  },

  // 34. GitHub Octocat
  {
    id: "github",
    name: "GitHub Octo",
    category: "brand",
    bgGradient: "from-zinc-900 to-black",
    borderClass: "border-zinc-700 shadow-black/20",
    accentColor: "#FFFFFF",
    badgeBg: "bg-zinc-800 text-white",
    keywords: ["github", "git", "repo", "octocat", "code", "dev"],
    variantNumber: 1,
    familyId: "github",
    familyName: "GitHub",
    label: "GitHub Octo",
    themeName: "Dark Octocat",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#24292F" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20 10C14.5 10 10 14.5 10 20C10 24.4 12.9 28.1 16.8 29.4C17.3 29.5 17.5 29.2 17.5 28.9V27.1C14.7 27.7 14.1 25.8 14.1 25.8C13.7 24.7 13 24.4 13 24.4C12.1 23.8 13.1 23.8 13.1 23.8C14.1 23.9 14.6 24.9 14.6 24.9C15.5 26.5 17 26 17.6 25.8C17.7 25.1 18 24.7 18.3 24.4C16.1 24.1 13.7 23.3 13.7 19.5C13.7 18.4 14.1 17.5 14.8 16.8C14.7 16.5 14.3 15.5 14.9 14.1C14.9 14.1 15.7 13.8 17.7 15.1C18.5 14.9 19.3 14.8 20.1 14.8C20.9 14.8 21.7 14.9 22.5 15.1C24.5 13.8 25.3 14.1 25.3 14.1C25.9 15.5 25.5 16.5 25.4 16.8C26.1 17.5 26.5 18.4 26.5 19.5C26.5 23.3 24.1 24.1 21.9 24.4C22.3 24.7 22.6 25.4 22.6 26.4V28.9C22.6 29.2 22.8 29.5 23.3 29.4C27.2 28.1 30.1 24.4 30.1 20C30.1 14.5 25.6 10 20 10Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },

  // 35. YouTube Play
  {
    id: "youtube",
    name: "YouTube Stream",
    category: "brand",
    bgGradient: "from-red-600 to-[#FF0000]",
    borderClass: "border-red-400 shadow-red-600/20",
    accentColor: "#FF0000",
    badgeBg: "bg-red-800 text-white",
    keywords: ["youtube", "video", "play", "stream", "media"],
    variantNumber: 1,
    familyId: "youtube",
    familyName: "YouTube",
    label: "YouTube Stream",
    themeName: "Red Play",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#FF0000" />
        <rect x="13" y="14" width="14" height="12" rx="3.5" fill="#FFFFFF" />
        <polygon points="18,17 24,20 18,23" fill="#FF0000" />
      </svg>
    ),
  },

  // 36. Spotify Audio Waves
  {
    id: "spotify",
    name: "Spotify Sound",
    category: "brand",
    bgGradient: "from-emerald-400 to-[#1DB954]",
    borderClass: "border-emerald-300 shadow-emerald-500/20",
    accentColor: "#1DB954",
    badgeBg: "bg-emerald-900 text-white",
    keywords: ["spotify", "music", "audio", "sound", "stream"],
    variantNumber: 1,
    familyId: "spotify",
    familyName: "Spotify",
    label: "Spotify Sound",
    themeName: "Spotify Green",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#1DB954" />
        <path d="M14 17C18 16 23 17 26 18.5" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M15 20.5C18.5 19.5 22.5 20.5 25 21.5" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 24C19 23.2 22 24 24 24.8" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },

  // 37. Apple Icon
  {
    id: "apple",
    name: "Apple Silicon",
    category: "brand",
    bgGradient: "from-zinc-900 to-black",
    borderClass: "border-zinc-700 shadow-black/20",
    accentColor: "#FFFFFF",
    badgeBg: "bg-zinc-800 text-white",
    keywords: ["apple", "mac", "ios", "iphone", "cupertino"],
    variantNumber: 1,
    familyId: "apple",
    familyName: "Apple",
    label: "Apple Silicon",
    themeName: "Dark Apple",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#000000" />
        <path
          d="M23.5 13C24 12 24.8 11.5 25.5 11C25.5 12 25 13 24.5 13.5C24 14.2 23 14.5 23.5 13ZM25.5 20.8C25.5 18.5 27 17.5 27 17.5C26 16 24.5 16 23.5 16C22.2 16 21.2 16.8 20.5 16.8C19.8 16.8 18.8 16 17.8 16C16 16 14.5 17.2 14.5 20C14.5 22.8 16.5 26.5 18 28.5C18.8 29.5 19.5 30 20.5 30C21.5 30 22 29.2 23 29.2C24 29.2 24.5 30 25.5 30C26.5 30 27.2 29 28 28C28.8 27 29.2 26 29.5 25.5C29.5 25.5 25.5 24.2 25.5 20.8Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },

  // 38. Microsoft Quad Tiles
  {
    id: "microsoft",
    name: "Windows Quad",
    category: "brand",
    bgGradient: "from-white to-slate-100",
    borderClass: "border-slate-300 shadow-slate-400/20",
    accentColor: "#00A4EF",
    badgeBg: "bg-blue-600 text-white",
    keywords: ["microsoft", "windows", "office", "azure", "365", "excel"],
    variantNumber: 1,
    familyId: "microsoft",
    familyName: "Microsoft",
    label: "Windows Quad",
    themeName: "Microsoft Quad",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="13" y="13" width="6.5" height="6.5" fill="#F25022" />
        <rect x="20.5" y="13" width="6.5" height="6.5" fill="#7FBA00" />
        <rect x="13" y="20.5" width="6.5" height="6.5" fill="#00A4EF" />
        <rect x="20.5" y="20.5" width="6.5" height="6.5" fill="#FFB900" />
      </svg>
    ),
  },

  // 39. Notion Monolith
  {
    id: "notion",
    name: "Notion Block",
    category: "tools",
    bgGradient: "from-white to-slate-100",
    borderClass: "border-slate-300 shadow-slate-400/20",
    accentColor: "#000000",
    badgeBg: "bg-black text-white",
    keywords: ["notion", "docs", "notes", "wiki", "workspace", "knowledge"],
    variantNumber: 1,
    familyId: "notion",
    familyName: "Notion",
    label: "Notion Block",
    themeName: "Notion Monolith",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
        <rect x="12" y="12" width="16" height="16" rx="2.5" fill="#000000" />
        <path d="M15 25V15L23 25V15" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  // 40. Figma Layers
  {
    id: "figma",
    name: "Figma Canvas",
    category: "tools",
    bgGradient: "from-zinc-900 to-black",
    borderClass: "border-zinc-700 shadow-black/20",
    accentColor: "#F24E1E",
    badgeBg: "bg-zinc-800 text-white",
    keywords: ["figma", "design", "ui", "ux", "prototype", "canvas"],
    variantNumber: 1,
    familyId: "figma",
    familyName: "Figma",
    label: "Figma Canvas",
    themeName: "Dark Figma",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#1E1E1E" />
        <path d="M16 14C16 12.3 17.3 11 19 11H22V17H19C17.3 17 16 15.7 16 14Z" fill="#F24E1E" />
        <path d="M22 11H25C26.7 11 28 12.3 28 14C28 15.7 26.7 17 25 17H22V11Z" fill="#FF7262" />
        <path d="M16 20C16 18.3 17.3 17 19 17H22V23H19C17.3 23 16 21.7 16 20Z" fill="#A259FF" />
        <circle cx="25" cy="20" r="3" fill="#1ABCFE" />
        <path d="M16 26C16 24.3 17.3 23 19 23H22V26C22 27.7 20.7 29 19 29C17.3 29 16 27.7 16 26Z" fill="#0ACF83" />
      </svg>
    ),
  },

  // 41. Paychex Shield
  {
    id: "paychex",
    name: "Paychex Portal",
    category: "fintech",
    bgGradient: "from-blue-600 to-[#004B87]",
    borderClass: "border-blue-400 shadow-blue-500/20",
    accentColor: "#004B87",
    badgeBg: "bg-blue-900 text-white",
    keywords: ["paychex", "payroll", "salary", "hr", "benefits", "w2"],
    variantNumber: 1,
    familyId: "paychex",
    familyName: "Paychex",
    label: "Paychex Portal",
    themeName: "Corporate Blue",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#004B87" />
        <path d="M20 11L28 15V22C28 26.5 24.5 29 20 30C15.5 29 12 26.5 12 22V15L20 11Z" fill="#FFFFFF" />
        <path d="M20 14L25 17V21C25 24 22.5 26 20 27C17.5 26 15 24 15 21V17L20 14Z" fill="#F97316" />
      </svg>
    ),
  },

  // 42. Leopard Wildcat
  {
    id: "leopard",
    name: "Leopard Alpha",
    category: "brand",
    bgGradient: "from-amber-400 via-amber-500 to-yellow-600",
    borderClass: "border-amber-300 shadow-amber-500/20",
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-700 text-white",
    keywords: ["leopard", "portal", "wildcat", "apex", "gold"],
    variantNumber: 1,
    familyId: "leopard",
    familyName: "Leopard",
    label: "Leopard Alpha",
    themeName: "Gold Amber",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#F59E0B" />
        {/* Ears */}
        <polygon points="12,12 16,9 17,14" fill="#78350F" />
        <polygon points="28,12 24,9 23,14" fill="#78350F" />
        {/* Face */}
        <ellipse cx="20" cy="21" rx="9" ry="7.5" fill="#FEF3C7" />
        <circle cx="17" cy="20" r="1.5" fill="#065F46" />
        <circle cx="23" cy="20" r="1.5" fill="#065F46" />
        <polygon points="19,23 21,23 20,24.5" fill="#B45309" />
        {/* Spots */}
        <circle cx="16" cy="16" r="1" fill="#78350F" />
        <circle cx="24" cy="16" r="1" fill="#78350F" />
        <circle cx="20" cy="15" r="1" fill="#78350F" />
      </svg>
    ),
  },

  // 43. Artech Nautical Compass Star
  {
    id: "artech",
    name: "Artech Compass",
    category: "brand",
    bgGradient: "from-blue-700 via-indigo-900 to-slate-950",
    borderClass: "border-sky-400/80 shadow-sky-500/20",
    accentColor: "#38BDF8",
    badgeBg: "bg-blue-950 text-sky-300",
    keywords: ["artech", "portal", "sl", "compass", "star", "marine", "nautical"],
    variantNumber: 1,
    familyId: "artech",
    familyName: "Artech",
    label: "Artech Compass",
    themeName: "Cobalt Marine",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#0A2540" stroke="#38BDF8" strokeWidth="1.5" />
        {/* 8-point compass star */}
        <polygon points="20,8 22,17 31,17 23.5,21.5 26.5,30 20,24.5 13.5,30 16.5,21.5 9,17 18,17" fill="#FBBF24" />
        <polygon points="20,11 21.5,18 20,20 18.5,18" fill="#F59E0B" />
        <circle cx="20" cy="20" r="2.5" fill="#FFFFFF" />
      </svg>
    ),
  },

  // 44. Master Vault Key
  {
    id: "masterkey",
    name: "Vault Key",
    category: "security",
    bgGradient: "from-indigo-600 to-slate-900",
    borderClass: "border-amber-400/80 shadow-amber-500/15",
    accentColor: "#F59E0B",
    badgeBg: "bg-indigo-950 text-amber-300",
    keywords: ["key", "master", "vault", "secret", "unlock", "passkey"],
    variantNumber: 1,
    familyId: "masterkey",
    familyName: "Masterkey",
    label: "Vault Key",
    themeName: "Golden Key",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#1E1B4B" stroke="#F59E0B" strokeWidth="1.2" />
        <circle cx="16" cy="18" r="4.5" stroke="#F59E0B" strokeWidth="2.2" fill="none" />
        <line x1="20" y1="18" x2="28" y2="18" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="25" y1="18" x2="25" y2="22" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="18" x2="28" y2="21" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },

  // 45. Faceted Diamond Gem
  {
    id: "diamond",
    name: "Cyan Diamond",
    category: "symbol",
    bgGradient: "from-cyan-400 to-blue-600",
    borderClass: "border-cyan-300 shadow-cyan-500/20",
    accentColor: "#06B6D4",
    badgeBg: "bg-cyan-800 text-white",
    keywords: ["diamond", "gem", "crystal", "precious", "cyan", "vanguard"],
    variantNumber: 1,
    familyId: "diamond",
    familyName: "Diamond",
    label: "Cyan Diamond",
    themeName: "Radiant Cyan",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#0891B2" />
        <polygon points="20,9 28,15 25,29 15,29 12,15" fill="#67E8F9" stroke="#FFFFFF" strokeWidth="1" />
        <polygon points="20,9 28,15 20,20 12,15" fill="#A5F3FC" />
        <polygon points="20,20 25,29 15,29" fill="#06B6D4" />
      </svg>
    ),
  },

  // 46. Steel Safe Vault Dial
  {
    id: "vaultsafe",
    name: "Steel Vault",
    category: "security",
    bgGradient: "from-slate-700 via-slate-800 to-slate-950",
    borderClass: "border-slate-500 shadow-slate-900/30",
    accentColor: "#94A3B8",
    badgeBg: "bg-black text-white",
    keywords: ["safe", "vault", "lock", "dial", "bank", "deposit", "secure"],
    variantNumber: 1,
    familyId: "vaultsafe",
    familyName: "Vaultsafe",
    label: "Steel Vault",
    themeName: "Brushed Steel",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="9" fill="#334155" stroke="#CBD5E1" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="3.5" fill="#94A3B8" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <line
            key={deg}
            x1="20"
            y1="12"
            x2="20"
            y2="14"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            transform={`rotate(${deg} 20 20)`}
          />
        ))}
      </svg>
    ),
  },

  // 47. Telegram Sky Jet
  {
    id: "telegram",
    name: "Telegram Jet",
    category: "app",
    bgGradient: "from-sky-400 to-[#229ED9]",
    borderClass: "border-sky-300 shadow-sky-500/20",
    accentColor: "#229ED9",
    badgeBg: "bg-sky-800 text-white",
    keywords: ["telegram", "paperplane", "plane", "jet", "chat", "message"],
    variantNumber: 1,
    familyId: "telegram",
    familyName: "Telegram",
    label: "Telegram Jet",
    themeName: "Sky Jet",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#229ED9" />
        <path d="M12 20L27 13L24 27L19.5 23L16.5 25.5V22L24 16.5L15 21L12 20Z" fill="#FFFFFF" />
      </svg>
    ),
  },

  // 48. Reddit Snoo
  {
    id: "reddit",
    name: "Reddit Snoo",
    category: "app",
    bgGradient: "from-orange-500 to-[#FF4500]",
    borderClass: "border-orange-400 shadow-orange-600/20",
    accentColor: "#FF4500",
    badgeBg: "bg-orange-800 text-white",
    keywords: ["reddit", "snoo", "alien", "forum", "community", "social"],
    variantNumber: 1,
    familyId: "reddit",
    familyName: "Reddit",
    label: "Reddit Snoo",
    themeName: "Sunset Snoo",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#FF4500" />
        <ellipse cx="20" cy="22" rx="8" ry="6" fill="#FFFFFF" />
        <circle cx="17.5" cy="21.5" r="1.5" fill="#FF4500" />
        <circle cx="22.5" cy="21.5" r="1.5" fill="#FF4500" />
        <circle cx="25" cy="13" r="2" fill="#FFFFFF" />
        <path d="M20 16L24 14" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },

  // 49. Terminal Command Prompt
  {
    id: "terminal",
    name: "Prompt >_",
    category: "tools",
    bgGradient: "from-black to-zinc-950",
    borderClass: "border-emerald-500/50 shadow-emerald-500/15",
    accentColor: "#10B981",
    badgeBg: "bg-black text-emerald-400",
    keywords: ["terminal", "cli", "command", "prompt", "bash", "linux", "code"],
    variantNumber: 1,
    familyId: "terminal",
    familyName: "Terminal",
    label: "Prompt >_",
    themeName: "Matrix Green",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#09090B" stroke="#10B981" strokeWidth="1.2" />
        <path d="M14 16L18 20L14 24" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="20" y1="24" x2="25" y2="24" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },

  // 50. Tubi Neon
  {
    id: "tubi",
    name: "Tubi Stream",
    category: "app",
    bgGradient: "from-purple-800 to-[#370076]",
    borderClass: "border-purple-400 shadow-purple-900/30",
    accentColor: "#EAB308",
    badgeBg: "bg-purple-950 text-yellow-300",
    keywords: ["tubi", "tv", "movies", "stream", "yellow", "purple"],
    variantNumber: 1,
    familyId: "tubi",
    familyName: "Tubi",
    label: "Tubi Stream",
    themeName: "Neon Violet",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#370076" />
        <text x="20" y="24" textAnchor="middle" fill="#FACC15" fontFamily="sans-serif" fontWeight="900" fontSize="11" letterSpacing="-0.5">
          tubi
        </text>
      </svg>
    ),
  },

  // 51. Space Rocket Launch
  {
    id: "rocket",
    name: "Space Rocket",
    category: "symbol",
    bgGradient: "from-indigo-900 to-slate-950",
    borderClass: "border-indigo-400 shadow-indigo-500/20",
    accentColor: "#6366F1",
    badgeBg: "bg-indigo-950 text-indigo-200",
    keywords: ["rocket", "launch", "space", "fast", "growth", "boost"],
    variantNumber: 1,
    familyId: "rocket",
    familyName: "Rocket",
    label: "Space Rocket",
    themeName: "Galaxy Launch",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#1E1B4B" />
        <path d="M26 14C26 14 26 18 24 20L20 24L16 20C14 18 14 14 14 14C14 14 18 14 20 16C22 14 26 14 26 14Z" fill="#FFFFFF" />
        <circle cx="20" cy="18" r="1.8" fill="#3B82F6" />
        <polygon points="17,25 20,29 23,25" fill="#F59E0B" />
      </svg>
    ),
  },

  // 52. Glowing Blue Padlock
  {
    id: "lockshield",
    name: "Cyber Lock",
    category: "security",
    bgGradient: "from-slate-950 to-black",
    borderClass: "border-blue-500/60 shadow-blue-500/20",
    accentColor: "#3B82F6",
    badgeBg: "bg-black text-blue-400",
    keywords: ["lock", "padlock", "security", "cyber", "safe", "crypto", "chief"],
    variantNumber: 1,
    familyId: "lockshield",
    familyName: "Lockshield",
    label: "Cyber Lock",
    themeName: "Cyber Blue",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#090D16" stroke="#3B82F6" strokeWidth="1.2" />
        <path d="M16 18V15C16 12.8 17.8 11 20 11C22.2 11 24 12.8 24 15V18" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
        <rect x="13.5" y="18" width="13" height="11" rx="2.5" fill="#3B82F6" />
        <circle cx="20" cy="23" r="1.5" fill="#090D16" />
        <line x1="20" y1="24.5" x2="20" y2="26.5" stroke="#090D16" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },

  // 53. Geometric Rubik Cube
  {
    id: "cube",
    name: "Rubik Isometric",
    category: "tools",
    bgGradient: "from-zinc-800 to-slate-900",
    borderClass: "border-zinc-500 shadow-black/20",
    accentColor: "#A1A1AA",
    badgeBg: "bg-zinc-800 text-white",
    keywords: ["cube", "3d", "isometric", "geometry", "puzzle", "block"],
    variantNumber: 1,
    familyId: "cube",
    familyName: "Cube",
    label: "Rubik Isometric",
    themeName: "Graphite",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#27272A" />
        <polygon points="20,11 27,15 20,19 13,15" fill="#60A5FA" />
        <polygon points="13,15 20,19 20,28 13,24" fill="#3B82F6" />
        <polygon points="20,19 27,15 27,24 20,28" fill="#1D4ED8" />
      </svg>
    ),
  },

  // 54. Dual Direction Compass Needle
  {
    id: "compass",
    name: "North Needle",
    category: "tools",
    bgGradient: "from-blue-600 to-slate-900",
    borderClass: "border-sky-400 shadow-blue-500/20",
    accentColor: "#38BDF8",
    badgeBg: "bg-blue-900 text-white",
    keywords: ["compass", "needle", "north", "navigate", "direction", "map"],
    variantNumber: 1,
    familyId: "compass",
    familyName: "Compass",
    label: "North Needle",
    themeName: "True North",
    renderSvg: (cls = "w-full h-full") => (
      <svg viewBox="0 0 40 40" className={cls} fill="none">
        <circle cx="20" cy="20" r="14" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.2" />
        <circle cx="20" cy="20" r="10" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
        <polygon points="20,11 23,20 20,19 17,20" fill="#EF4444" />
        <polygon points="20,29 23,20 20,21 17,20" fill="#E2E8F0" />
        <circle cx="20" cy="20" r="1.5" fill="#0F172A" />
      </svg>
    ),
  },
];

// Backwards-compatibility legacy mapping (so existing stored logins seamlessly resolve)
const LEGACY_ID_MAP: Record<string, string> = {
  "chief-1": "lockshield",
  "chief-2": "discord",
  "chief-3": "diia",
  "marshal-1": "aceofspades",
  "marshal-2": "flame",
  "marshal-3": "tumblr",
  "vanguard-1": "sunburst",
  "vanguard-2": "diamond",
  "vanguard-3": "wavecurve",
  "centurion-1": "canarya",
  "centurion-2": "shieldcheck",
  "centurion-3": "signpost",
  "navigator-1": "artech",
  "navigator-2": "redarrow",
  "navigator-3": "compass",
  "sentinel-1": "vaultsafe",
  "sentinel-2": "shieldbolt",
  "sentinel-3": "terminal",
  "leopard-1": "leopard",
  "leopard-2": "lightning",
  "leopard-3": "threads",
  "lion-1": "timhortons",
  "lion-2": "acorn",
  "lion-3": "dove",
  "owl-1": "briefcase",
  "owl-2": "stripe",
  "owl-3": "quickbooks",
  "dragon-1": "flame",
  "dragon-2": "targetring",
  "dragon-3": "handtap",
};

export const ALL_VAULT_AVATARS = VAULT_ICONS;

/**
 * Intelligent Auto-Detector: Matches service names, categories, or URLs to the best icon
 */
export function detectVaultAvatar(title = "", category = "", url = ""): string {
  const combined = `${title} ${category} ${url}`.toLowerCase();

  // 1. Direct Keyword Matching
  if (combined.includes("artech")) return "artech";
  if (combined.includes("leopard")) return "leopard";
  if (combined.includes("quickbooks") || combined.includes("intuit") || combined.includes("accounting")) return "quickbooks";
  if (combined.includes("paychex") || combined.includes("payroll")) return "paychex";
  if (combined.includes("gemini") || combined.includes("google") || combined.includes("gmail")) return "google";
  if (combined.includes("groq") || combined.includes("lightning") || combined.includes("bolt")) return "lightning";
  if (combined.includes("aws") || combined.includes("amazon")) return "aws";
  if (combined.includes("stripe") || combined.includes("billing") || combined.includes("payment")) return "stripe";
  if (combined.includes("github") || combined.includes("git")) return "github";
  if (combined.includes("discord") || combined.includes("bot")) return "discord";
  if (combined.includes("slack")) return "slack";
  if (combined.includes("notion")) return "notion";
  if (combined.includes("figma") || combined.includes("design")) return "figma";
  if (combined.includes("microsoft") || combined.includes("office") || combined.includes("azure")) return "microsoft";
  if (combined.includes("apple") || combined.includes("mac") || combined.includes("icloud")) return "apple";
  if (combined.includes("telegram")) return "telegram";
  if (combined.includes("reddit")) return "reddit";
  if (combined.includes("youtube")) return "youtube";
  if (combined.includes("spotify")) return "spotify";
  if (combined.includes("tubi")) return "tubi";
  if (combined.includes("portal")) return "layeredportal";
  if (combined.includes("vault") || combined.includes("key") || combined.includes("secret")) return "masterkey";
  if (combined.includes("security") || combined.includes("firewall") || combined.includes("admin")) return "lockshield";
  if (combined.includes("doc") || combined.includes("drive") || combined.includes("file")) return "document";
  if (combined.includes("task") || combined.includes("note") || combined.includes("todo")) return "tickmark";

  // 2. Hash-based deterministic fallback for any unknown name
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % VAULT_ICONS.length;
  return VAULT_ICONS[index].id;
}

export function getAvatarFamilyId(iconId?: string, title = "", category = "", url = ""): string {
  if (iconId) {
    if (VAULT_ICONS.some((i) => i.id === iconId)) return iconId;
    if (LEGACY_ID_MAP[iconId]) return LEGACY_ID_MAP[iconId];
  }
  return detectVaultAvatar(title, category, url);
}

interface VaultBrandAvatarProps {
  iconId?: string;
  title?: string;
  category?: string;
  url?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showBadge?: boolean;
  badgeNumber?: number;
}

export function VaultBrandAvatar({
  iconId,
  title = "",
  category = "",
  url = "",
  size = "md",
  className = "",
}: VaultBrandAvatarProps) {
  // Resolve icon
  let resolvedId = iconId;
  if (!resolvedId || (!VAULT_ICONS.some((i) => i.id === resolvedId) && !LEGACY_ID_MAP[resolvedId])) {
    resolvedId = detectVaultAvatar(title, category, url);
  }
  const cleanId = LEGACY_ID_MAP[resolvedId] || resolvedId;
  const icon = VAULT_ICONS.find((i) => i.id === cleanId) || VAULT_ICONS[0];

  const sizeClasses =
    size === "sm"
      ? "w-8 h-8 rounded-xl"
      : size === "lg"
      ? "w-14 h-14 rounded-2xl"
      : "w-11 h-11 rounded-2xl";

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center p-1 bg-gradient-to-br ${icon.bgGradient} border ${icon.borderClass} shadow-md transition-all duration-200 ${sizeClasses} ${className}`}
      title={icon.name}
    >
      <div className="w-full h-full flex items-center justify-center">
        {icon.renderSvg("w-full h-full drop-shadow-sm")}
      </div>
    </div>
  );
}

interface VaultIconPickerProps {
  selectedIcon: string;
  onSelect: (iconId: string) => void;
  detectedFallback?: string;
}

/**
 * 6-at-a-time Modern Icon Pack Picker with Animated Dice Reroll & Auto-Pick
 */
export function VaultIconPicker({
  selectedIcon,
  onSelect,
  detectedFallback = "artech",
}: VaultIconPickerProps) {
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  // Clean currently selected icon
  const activeId =
    (selectedIcon && (LEGACY_ID_MAP[selectedIcon] || selectedIcon)) ||
    (detectedFallback && (LEGACY_ID_MAP[detectedFallback] || detectedFallback)) ||
    VAULT_ICONS[0].id;

  const currentIcon = VAULT_ICONS.find((i) => i.id === activeId) || VAULT_ICONS[0];

  // Number of icons shown per roll
  const ICONS_PER_PAGE = 6;
  const totalPages = Math.ceil(VAULT_ICONS.length / ICONS_PER_PAGE);

  // Active slice of 6 icons
  const displayedIcons = useMemo(() => {
    const start = pageIndex * ICONS_PER_PAGE;
    return VAULT_ICONS.slice(start, start + ICONS_PER_PAGE);
  }, [pageIndex]);

  // Dice Reroll action with smooth 360-degree rotation animation
  const handleReroll = () => {
    setIsRolling(true);
    setTimeout(() => {
      setPageIndex((prev) => (prev + 1) % totalPages);
      setIsRolling(false);
    }, 280);
  };

  // Auto-Pick action: detects best icon and jumps to that icon's page
  const handleAutoPick = () => {
    const bestId = detectedFallback ? LEGACY_ID_MAP[detectedFallback] || detectedFallback : "artech";
    onSelect(bestId);
    // Find what page it's on so it's visible in the 6-icon shelf
    const index = VAULT_ICONS.findIndex((i) => i.id === bestId);
    if (index >= 0) {
      setPageIndex(Math.floor(index / ICONS_PER_PAGE));
    }
  };

  return (
    <div className="space-y-3 bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 max-w-full overflow-hidden">
      {/* 1. Header Bar with Auto-Pick */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <span>Login Crest & Icon</span>
            <span className="text-[10px] font-semibold text-slate-400">
              ({VAULT_ICONS.length} Pack Emblems)
            </span>
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Pick any recognizable badge to visually anchor this login card.
          </p>
        </div>

        {/* Auto-Pick Button */}
        <button
          type="button"
          onClick={handleAutoPick}
          className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
          title="Auto-detect icon based on service name or portal URL"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Auto-Pick</span>
        </button>
      </div>

      {/* 2. Selected Icon Banner (No variations, clean & prominent) */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200/90 flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <VaultBrandAvatar iconId={currentIcon.id} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900 tracking-tight">
                {currentIcon.name}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                {currentIcon.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {currentIcon.themeName} theme • Visual identity for this account
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Active</span>
          </span>
        </div>
      </div>

      {/* 3. The 6-Icon Grid with Animated Dice Reroll */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs px-0.5">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <span>Choose from 6 Emblems:</span>
            <span className="text-[10px] text-slate-400 font-mono">
              (Page {pageIndex + 1} of {totalPages})
            </span>
          </span>

          {/* Animated Dice Reroll Button */}
          <button
            type="button"
            onClick={handleReroll}
            disabled={isRolling}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 cursor-pointer transition-all flex items-center gap-1.5"
            title="Roll 6 fresh icons from the pack"
          >
            <Dices
              className={`w-3.5 h-3.5 transition-transform duration-500 ${
                isRolling ? "rotate-[360deg] scale-125" : ""
              }`}
            />
            <span>🎲 Reroll Icons</span>
          </button>
        </div>

        {/* 6 Icons Shelf */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
          {displayedIcons.map((icon) => {
            const isSelected = icon.id === currentIcon.id;

            return (
              <button
                key={icon.id}
                type="button"
                onClick={() => onSelect(icon.id)}
                className={`group relative flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? "bg-blue-50/90 border-2 border-blue-600 shadow-md shadow-blue-500/15 scale-105"
                    : "bg-white border border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/80"
                }`}
                title={icon.name}
              >
                <div className="relative">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center p-1 bg-gradient-to-br ${icon.bgGradient} border ${icon.borderClass} shadow-xs group-hover:scale-105 transition-transform`}
                  >
                    {icon.renderSvg("w-full h-full")}
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <span
                  className={`text-[11px] font-bold tracking-tight truncate max-w-[72px] mt-1.5 ${
                    isSelected
                      ? "text-blue-700 font-extrabold"
                      : "text-slate-700 group-hover:text-slate-900"
                  }`}
                >
                  {icon.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
