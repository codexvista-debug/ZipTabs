"use client";

import React from "react";
import { Check, Sparkles } from "lucide-react";

export interface VaultAvatarItem {
  id: string;
  familyId: string;
  familyName: string;
  variantNumber: 1 | 2 | 3;
  label: string;
  themeName: string;
  bgGradient: string;
  borderClass: string;
  accentColor: string;
  badgeBg: string;
}

export interface VaultAvatarFamily {
  familyId: string;
  familyName: string;
  description: string;
  variants: VaultAvatarItem[];
}

export const VAULT_AVATAR_FAMILIES: VaultAvatarFamily[] = [
  {
    familyId: "chief",
    familyName: "Commander",
    description: "Star commander crest badge",
    variants: [
      {
        id: "chief-1",
        familyId: "chief",
        familyName: "Commander",
        variantNumber: 1,
        label: "Commander Prime",
        themeName: "Gold Star",
        bgGradient: "from-amber-400 via-yellow-600 to-slate-900",
        borderClass: "border-yellow-300/80 shadow-yellow-500/15",
        accentColor: "#F59E0B",
        badgeBg: "bg-yellow-800 text-yellow-50",
      },
      {
        id: "chief-2",
        familyId: "chief",
        familyName: "Commander",
        variantNumber: 2,
        label: "Commander Tactical",
        themeName: "Cobalt Star",
        bgGradient: "from-blue-400 via-indigo-600 to-slate-950",
        borderClass: "border-blue-300/80 shadow-blue-500/15",
        accentColor: "#60A5FA",
        badgeBg: "bg-blue-800 text-blue-50",
      },
      {
        id: "chief-3",
        familyId: "chief",
        familyName: "Commander",
        variantNumber: 3,
        label: "Commander Stealth",
        themeName: "Obsidian Star",
        bgGradient: "from-slate-600 via-zinc-800 to-black",
        borderClass: "border-slate-500/80 shadow-slate-900/20",
        accentColor: "#94A3B8",
        badgeBg: "bg-zinc-900 text-white",
      },
    ],
  },
  {
    familyId: "marshal",
    familyName: "Marshal",
    description: "Imperial star crown crest badge",
    variants: [
      {
        id: "marshal-1",
        familyId: "marshal",
        familyName: "Marshal",
        variantNumber: 1,
        label: "Marshal Imperial",
        themeName: "Imperial Gold",
        bgGradient: "from-yellow-400 via-amber-500 to-stone-900",
        borderClass: "border-yellow-300/80 shadow-yellow-500/15",
        accentColor: "#EAB308",
        badgeBg: "bg-yellow-700 text-yellow-50",
      },
      {
        id: "marshal-2",
        familyId: "marshal",
        familyName: "Marshal",
        variantNumber: 2,
        label: "Marshal Crimson",
        themeName: "Ruby Crimson",
        bgGradient: "from-rose-400 via-red-600 to-slate-950",
        borderClass: "border-rose-300/80 shadow-rose-500/15",
        accentColor: "#F43F5E",
        badgeBg: "bg-rose-700 text-rose-50",
      },
      {
        id: "marshal-3",
        familyId: "marshal",
        familyName: "Marshal",
        variantNumber: 3,
        label: "Marshal Sapphire",
        themeName: "Royal Sapphire",
        bgGradient: "from-blue-400 via-indigo-700 to-slate-950",
        borderClass: "border-blue-300/80 shadow-blue-500/15",
        accentColor: "#3B82F6",
        badgeBg: "bg-blue-900 text-blue-50",
      },
    ],
  },
  {
    familyId: "vanguard",
    familyName: "Vanguard",
    description: "Faceted star diamond radiant crest",
    variants: [
      {
        id: "vanguard-1",
        familyId: "vanguard",
        familyName: "Vanguard",
        variantNumber: 1,
        label: "Vanguard Solar",
        themeName: "Solar Amber",
        bgGradient: "from-amber-400 via-orange-600 to-stone-900",
        borderClass: "border-amber-300/80 shadow-amber-500/15",
        accentColor: "#F59E0B",
        badgeBg: "bg-amber-700 text-amber-50",
      },
      {
        id: "vanguard-2",
        familyId: "vanguard",
        familyName: "Vanguard",
        variantNumber: 2,
        label: "Vanguard Astral",
        themeName: "Cyan Starlight",
        bgGradient: "from-cyan-400 via-teal-600 to-slate-950",
        borderClass: "border-cyan-300/80 shadow-cyan-500/15",
        accentColor: "#06B6D4",
        badgeBg: "bg-teal-700 text-teal-50",
      },
      {
        id: "vanguard-3",
        familyId: "vanguard",
        familyName: "Vanguard",
        variantNumber: 3,
        label: "Vanguard Amethyst",
        themeName: "Neon Violet",
        bgGradient: "from-purple-400 via-indigo-600 to-slate-950",
        borderClass: "border-purple-300/80 shadow-purple-500/15",
        accentColor: "#A855F7",
        badgeBg: "bg-purple-800 text-purple-50",
      },
    ],
  },
  {
    familyId: "centurion",
    familyName: "Centurion",
    description: "Star laurel victory crest badge",
    variants: [
      {
        id: "centurion-1",
        familyId: "centurion",
        familyName: "Centurion",
        variantNumber: 1,
        label: "Centurion Gold",
        themeName: "Golden Laurel",
        bgGradient: "from-yellow-300 via-amber-500 to-stone-900",
        borderClass: "border-amber-300/80 shadow-amber-500/15",
        accentColor: "#EAB308",
        badgeBg: "bg-amber-800 text-amber-50",
      },
      {
        id: "centurion-2",
        familyId: "centurion",
        familyName: "Centurion",
        variantNumber: 2,
        label: "Centurion Jade",
        themeName: "Jade Laurel",
        bgGradient: "from-emerald-400 via-teal-700 to-slate-950",
        borderClass: "border-emerald-300/80 shadow-emerald-500/15",
        accentColor: "#10B981",
        badgeBg: "bg-emerald-800 text-emerald-50",
      },
      {
        id: "centurion-3",
        familyId: "centurion",
        familyName: "Centurion",
        variantNumber: 3,
        label: "Centurion Silver",
        themeName: "Silver Laurel",
        bgGradient: "from-slate-300 via-zinc-600 to-black",
        borderClass: "border-slate-400/80 shadow-slate-900/15",
        accentColor: "#94A3B8",
        badgeBg: "bg-zinc-800 text-white",
      },
    ],
  },
  {
    familyId: "navigator",
    familyName: "Navigator",
    description: "Nautical star compass emblem",
    variants: [
      {
        id: "navigator-1",
        familyId: "navigator",
        familyName: "Navigator",
        variantNumber: 1,
        label: "Navigator Ocean",
        themeName: "Cobalt Compass",
        bgGradient: "from-sky-400 via-blue-600 to-slate-950",
        borderClass: "border-sky-300/80 shadow-sky-500/15",
        accentColor: "#38BDF8",
        badgeBg: "bg-blue-800 text-blue-50",
      },
      {
        id: "navigator-2",
        familyId: "navigator",
        familyName: "Navigator",
        variantNumber: 2,
        label: "Navigator Sunset",
        themeName: "Coral Compass",
        bgGradient: "from-amber-400 via-rose-600 to-slate-950",
        borderClass: "border-amber-300/80 shadow-amber-500/15",
        accentColor: "#F43F5E",
        badgeBg: "bg-rose-800 text-rose-50",
      },
      {
        id: "navigator-3",
        familyId: "navigator",
        familyName: "Navigator",
        variantNumber: 3,
        label: "Navigator Polar",
        themeName: "Midnight Frost",
        bgGradient: "from-teal-300 via-cyan-700 to-slate-950",
        borderClass: "border-teal-300/80 shadow-teal-500/15",
        accentColor: "#2DD4BF",
        badgeBg: "bg-teal-900 text-teal-50",
      },
    ],
  },
  {
    familyId: "sentinel",
    familyName: "Sentinel",
    description: "Star fortress hex armor plate",
    variants: [
      {
        id: "sentinel-1",
        familyId: "sentinel",
        familyName: "Sentinel",
        variantNumber: 1,
        label: "Sentinel Prime",
        themeName: "Titanium Gold",
        bgGradient: "from-amber-400 via-yellow-600 to-stone-900",
        borderClass: "border-yellow-300/80 shadow-yellow-500/15",
        accentColor: "#F59E0B",
        badgeBg: "bg-yellow-800 text-yellow-50",
      },
      {
        id: "sentinel-2",
        familyId: "sentinel",
        familyName: "Sentinel",
        variantNumber: 2,
        label: "Sentinel Emerald",
        themeName: "Emerald Armor",
        bgGradient: "from-emerald-400 via-teal-600 to-slate-950",
        borderClass: "border-emerald-300/80 shadow-emerald-500/15",
        accentColor: "#10B981",
        badgeBg: "bg-emerald-800 text-emerald-50",
      },
      {
        id: "sentinel-3",
        familyId: "sentinel",
        familyName: "Sentinel",
        variantNumber: 3,
        label: "Sentinel Obsidian",
        themeName: "Obsidian Armor",
        bgGradient: "from-zinc-500 via-neutral-800 to-black",
        borderClass: "border-neutral-500/80 shadow-black/30",
        accentColor: "#A1A1AA",
        badgeBg: "bg-neutral-900 text-white",
      },
    ],
  },
  {
    familyId: "leopard",
    familyName: "Leopard",
    description: "Agile feline with spot patterns",
    variants: [
      {
        id: "leopard-1",
        familyId: "leopard",
        familyName: "Leopard",
        variantNumber: 1,
        label: "Leopard Alpha",
        themeName: "Gold / Amber",
        bgGradient: "from-amber-400 via-amber-500 to-yellow-600",
        borderClass: "border-amber-300/80 shadow-amber-500/15",
        accentColor: "#F59E0B",
        badgeBg: "bg-amber-600 text-amber-50",
      },
      {
        id: "leopard-2",
        familyId: "leopard",
        familyName: "Leopard",
        variantNumber: 2,
        label: "Leopard Electric",
        themeName: "Neon Cyan",
        bgGradient: "from-cyan-400 via-teal-500 to-blue-600",
        borderClass: "border-cyan-300/80 shadow-cyan-500/15",
        accentColor: "#06B6D4",
        badgeBg: "bg-teal-700 text-teal-50",
      },
      {
        id: "leopard-3",
        familyId: "leopard",
        familyName: "Leopard",
        variantNumber: 3,
        label: "Leopard Stealth",
        themeName: "Mystic Violet",
        bgGradient: "from-purple-500 via-indigo-600 to-slate-900",
        borderClass: "border-purple-300/80 shadow-purple-500/15",
        accentColor: "#8B5CF6",
        badgeBg: "bg-purple-800 text-purple-50",
      },
    ],
  },
  {
    familyId: "lion",
    familyName: "Lion",
    description: "Royal apex guardian with crown",
    variants: [
      {
        id: "lion-1",
        familyId: "lion",
        familyName: "Lion",
        variantNumber: 1,
        label: "Lion Crown",
        themeName: "Imperial Gold",
        bgGradient: "from-yellow-400 via-amber-500 to-orange-600",
        borderClass: "border-yellow-300/80 shadow-yellow-500/15",
        accentColor: "#EAB308",
        badgeBg: "bg-yellow-700 text-yellow-50",
      },
      {
        id: "lion-2",
        familyId: "lion",
        familyName: "Lion",
        variantNumber: 2,
        label: "Lion Jade",
        themeName: "Emerald Guardian",
        bgGradient: "from-emerald-400 via-teal-600 to-slate-800",
        borderClass: "border-emerald-300/80 shadow-emerald-500/15",
        accentColor: "#10B981",
        badgeBg: "bg-emerald-700 text-emerald-50",
      },
      {
        id: "lion-3",
        familyId: "lion",
        familyName: "Lion",
        variantNumber: 3,
        label: "Lion Crimson",
        themeName: "Ruby Monarch",
        bgGradient: "from-rose-400 via-red-600 to-slate-900",
        borderClass: "border-rose-300/80 shadow-rose-500/15",
        accentColor: "#F43F5E",
        badgeBg: "bg-rose-700 text-rose-50",
      },
    ],
  },
  {
    familyId: "owl",
    familyName: "Owl",
    description: "Wise nocturnal scout with luminous eyes",
    variants: [
      {
        id: "owl-1",
        familyId: "owl",
        familyName: "Owl",
        variantNumber: 1,
        label: "Owl Emerald",
        themeName: "Forest Sage",
        bgGradient: "from-teal-400 via-emerald-600 to-slate-900",
        borderClass: "border-teal-300/80 shadow-teal-500/15",
        accentColor: "#34D399",
        badgeBg: "bg-emerald-800 text-emerald-50",
      },
      {
        id: "owl-2",
        familyId: "owl",
        familyName: "Owl",
        variantNumber: 2,
        label: "Owl Night",
        themeName: "Indigo Starlight",
        bgGradient: "from-indigo-400 via-blue-700 to-slate-950",
        borderClass: "border-indigo-300/80 shadow-indigo-500/15",
        accentColor: "#818CF8",
        badgeBg: "bg-indigo-900 text-indigo-50",
      },
      {
        id: "owl-3",
        familyId: "owl",
        familyName: "Owl",
        variantNumber: 3,
        label: "Owl Solar",
        themeName: "Golden Sun",
        bgGradient: "from-yellow-300 via-amber-500 to-stone-900",
        borderClass: "border-amber-300/80 shadow-amber-500/15",
        accentColor: "#FBBF24",
        badgeBg: "bg-amber-700 text-amber-50",
      },
    ],
  },
  {
    familyId: "falcon",
    familyName: "Falcon",
    description: "Sharp raptor soaring across realms",
    variants: [
      {
        id: "falcon-1",
        familyId: "falcon",
        familyName: "Falcon",
        variantNumber: 1,
        label: "Falcon Talon",
        themeName: "Desert Gold",
        bgGradient: "from-amber-300 via-yellow-600 to-stone-900",
        borderClass: "border-amber-300/80 shadow-amber-500/15",
        accentColor: "#FBBF24",
        badgeBg: "bg-amber-800 text-amber-50",
      },
      {
        id: "falcon-2",
        familyId: "falcon",
        familyName: "Falcon",
        variantNumber: 2,
        label: "Falcon Sky",
        themeName: "High Altitude",
        bgGradient: "from-cyan-300 via-blue-600 to-slate-900",
        borderClass: "border-cyan-300/80 shadow-cyan-500/15",
        accentColor: "#38BDF8",
        badgeBg: "bg-blue-800 text-blue-50",
      },
      {
        id: "falcon-3",
        familyId: "falcon",
        familyName: "Falcon",
        variantNumber: 3,
        label: "Falcon Dusk",
        themeName: "Night Talon",
        bgGradient: "from-slate-400 via-purple-800 to-slate-950",
        borderClass: "border-purple-300/80 shadow-purple-500/15",
        accentColor: "#C084FC",
        badgeBg: "bg-purple-900 text-purple-50",
      },
    ],
  },
];

// Flat list of all 30 avatars
export const ALL_VAULT_AVATARS: VaultAvatarItem[] = VAULT_AVATAR_FAMILIES.flatMap(
  (f) => f.variants
);

/**
 * Renders the unique vector character face inside a 40x40 canvas
 */
function renderMascotFace(familyId: string, variantNum: 1 | 2 | 3) {
  switch (familyId) {
    case "leopard":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Ears */}
          <path d="M9 13 C6 8, 14 6, 16 11 Z" fill="#FDE68A" />
          <path d="M10 12 C8 9, 13 8, 14 11 Z" fill="#F59E0B" />
          <path d="M31 13 C34 8, 26 6, 24 11 Z" fill="#FDE68A" />
          <path d="M30 12 C32 9, 27 8, 26 11 Z" fill="#F59E0B" />
          {/* Head */}
          <ellipse cx="20" cy="22" rx="14" ry="12" fill="#FEF3C7" />
          {/* Spots */}
          <circle cx="13" cy="16" r="1.6" fill="#78350F" opacity="0.8" />
          <circle cx="27" cy="16" r="1.6" fill="#78350F" opacity="0.8" />
          <circle cx="20" cy="14" r="1.4" fill="#78350F" opacity="0.8" />
          <circle cx="10" cy="23" r="1.5" fill="#78350F" opacity="0.7" />
          <circle cx="30" cy="23" r="1.5" fill="#78350F" opacity="0.7" />
          {/* Eyes with slant */}
          <ellipse cx="15" cy="20" rx="2.5" ry="3.2" fill="#065F46" />
          <ellipse cx="25" cy="20" rx="2.5" ry="3.2" fill="#065F46" />
          <ellipse cx="15.5" cy="19.5" rx="0.9" ry="1.4" fill="#FFFFFF" />
          <ellipse cx="25.5" cy="19.5" rx="0.9" ry="1.4" fill="#FFFFFF" />
          {/* Snout & Nose */}
          <ellipse cx="20" cy="25" rx="4.5" ry="3" fill="#FFFFFF" />
          <polygon points="18.5,23.8 21.5,23.8 20,25.4" fill="#EA580C" />
          {/* Whiskers */}
          <line x1="8" y1="24" x2="15" y2="25" stroke="#78350F" strokeWidth="0.8" opacity="0.6" />
          <line x1="8" y1="26" x2="15" y2="26" stroke="#78350F" strokeWidth="0.8" opacity="0.6" />
          <line x1="32" y1="24" x2="25" y2="25" stroke="#78350F" strokeWidth="0.8" opacity="0.6" />
          <line x1="32" y1="26" x2="25" y2="26" stroke="#78350F" strokeWidth="0.8" opacity="0.6" />
        </svg>
      );

    case "lion":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Majestic Mane */}
          <circle cx="20" cy="21" r="15" fill="#B45309" />
          <circle cx="20" cy="21" r="12.5" fill="#D97706" />
          {/* Crown */}
          <polygon points="13,10 16.5,13 20,8 23.5,13 27,10 26,14 14,14" fill="#FACC15" />
          <circle cx="20" cy="8" r="1" fill="#DC2626" />
          {/* Face */}
          <ellipse cx="20" cy="22" rx="9" ry="8.5" fill="#FEF08A" />
          {/* Eyes */}
          <circle cx="16.5" cy="20" r="1.8" fill="#1E293B" />
          <circle cx="23.5" cy="20" r="1.8" fill="#1E293B" />
          <circle cx="16" cy="19.5" r="0.6" fill="#FFFFFF" />
          <circle cx="23" cy="19.5" r="0.6" fill="#FFFFFF" />
          {/* Muzzle */}
          <ellipse cx="20" cy="24.5" rx="3.5" ry="2.5" fill="#FFFBEB" />
          <polygon points="18.8,23.5 21.2,23.5 20,24.8" fill="#78350F" />
        </svg>
      );

    case "chief":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Shield Emblem Outline */}
          <path d="M20 6 L33 11 L33 23 C33 30 20 35 20 35 C20 35 7 30 7 23 L7 11 Z" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
          {/* Inner Plate */}
          <path d="M20 9 L30 13 L30 22 C30 28 20 32 20 32 C20 32 10 28 10 22 L10 13 Z" fill="#1E293B" />
          {/* Commander Star */}
          <polygon
            points="20,12 22.5,17.5 28.5,17.5 23.5,21 25.5,27 20,23.5 14.5,27 16.5,21 11.5,17.5 17.5,17.5"
            fill={variantNum === 1 ? "#FACC15" : variantNum === 2 ? "#60A5FA" : "#E2E8F0"}
          />
          <circle cx="20" cy="19.5" r="1.3" fill="#FFFFFF" opacity="0.9" />
        </svg>
      );

    case "marshal":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Crown Base */}
          <path d="M9 28 L31 28 L29 32 L11 32 Z" fill="#0F172A" stroke="#EAB308" strokeWidth="1" />
          <circle cx="15" cy="30" r="1" fill="#FACC15" />
          <circle cx="20" cy="30" r="1" fill="#FACC15" />
          <circle cx="25" cy="30" r="1" fill="#FACC15" />
          {/* Crown Peaks */}
          <polygon points="9,27 12,16 16,22 20,11 24,22 28,16 31,27" fill="#1E293B" stroke="#EAB308" strokeWidth="1.4" />
          {/* Star on Center Peak */}
          <polygon
            points="20,7 21.2,10 24,10 21.8,11.8 22.5,14.5 20,13 17.5,14.5 18.2,11.8 16,10 18.8,10"
            fill={variantNum === 1 ? "#FACC15" : variantNum === 2 ? "#FB7185" : "#60A5FA"}
          />
          {/* Peak Orbs */}
          <circle cx="12" cy="16" r="1.4" fill="#FACC15" />
          <circle cx="28" cy="16" r="1.4" fill="#FACC15" />
          {/* Center Crest Star */}
          <polygon points="20,19 21.2,22 24,22 21.8,23.5 22.5,26 20,24.5 17.5,26 18.2,23.5 16,22 18.8,22" fill="#FDE047" />
        </svg>
      );

    case "vanguard":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Faceted Diamond Body */}
          <polygon points="20,6 34,20 20,34 6,20" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
          {/* Inner Diamond */}
          <polygon points="20,9 31,20 20,31 9,20" fill="#1E293B" />
          {/* 8-Point Radiant Star */}
          <polygon
            points="20,11 21.5,17.5 28,19 21.5,20.5 20,27 18.5,20.5 12,19 18.5,17.5"
            fill={variantNum === 1 ? "#FACC15" : variantNum === 2 ? "#38BDF8" : "#C084FC"}
          />
          <polygon points="20,14 21,18 25,19 21,20 20,24 19,20 15,19 19,18" fill="#FFFFFF" opacity="0.85" />
          {/* Corner Studs */}
          <circle cx="20" cy="7.5" r="1" fill="#FDE047" />
          <circle cx="32.5" cy="20" r="1" fill="#FDE047" />
          <circle cx="20" cy="32.5" r="1" fill="#FDE047" />
          <circle cx="7.5" cy="20" r="1" fill="#FDE047" />
        </svg>
      );

    case "centurion":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Circular Medal Frame */}
          <circle cx="20" cy="20" r="14" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="11.5" fill="#1E293B" />
          {/* Laurel Wreath Leaves */}
          <path d="M12 25 C10 20, 11 14, 15 10 C14 13, 14 17, 16 20 Z" fill="#FDE047" opacity="0.8" />
          <path d="M28 25 C30 20, 29 14, 25 10 C26 13, 26 17, 24 20 Z" fill="#FDE047" opacity="0.8" />
          {/* Central 5-point Star */}
          <polygon
            points="20,13 22,17.5 27,17.5 23,20.5 24.5,25.5 20,22.5 15.5,25.5 17,20.5 13,17.5 18,17.5"
            fill={variantNum === 1 ? "#FACC15" : variantNum === 2 ? "#34D399" : "#E2E8F0"}
          />
          <circle cx="20" cy="19.5" r="1" fill="#FFFFFF" />
        </svg>
      );

    case "navigator":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Compass Outer Ring */}
          <circle cx="20" cy="20" r="14" fill="#0F172A" stroke="#60A5FA" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="12" fill="#1E293B" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="1.5 2" />
          {/* Compass Star Needle (North / South) */}
          <polygon points="20,7 22,18 20,20 18,18" fill="#EF4444" />
          <polygon points="20,33 22,22 20,20 18,22" fill="#94A3B8" />
          {/* Compass Star Needle (East / West) */}
          <polygon points="33,20 22,22 20,20 22,18" fill="#F8FAFC" />
          <polygon points="7,20 18,22 20,20 18,18" fill="#64748B" />
          {/* Center Star Hub */}
          <polygon points="20,15 21,18.5 24.5,19.5 21,20.5 20,24 19,20.5 15.5,19.5 19,18.5" fill="#FACC15" />
          <circle cx="20" cy="19.5" r="1.5" fill="#FFFFFF" />
        </svg>
      );

    case "sentinel":
    case "bot":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Hexagonal Armor Plate */}
          <polygon points="20,6 32,13 32,27 20,34 8,27 8,13" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
          <polygon points="20,9 29,14 29,26 20,31 11,26 11,14" fill="#1E293B" />
          {/* Armor Rivets */}
          <circle cx="20" cy="8.5" r="0.9" fill="#94A3B8" />
          <circle cx="29.5" cy="14" r="0.9" fill="#94A3B8" />
          <circle cx="29.5" cy="26" r="0.9" fill="#94A3B8" />
          <circle cx="20" cy="31.5" r="0.9" fill="#94A3B8" />
          <circle cx="10.5" cy="26" r="0.9" fill="#94A3B8" />
          <circle cx="10.5" cy="14" r="0.9" fill="#94A3B8" />
          {/* Star Emblem */}
          <polygon
            points="20,13 22,18 27.5,18 23,21.5 24.8,27 20,23.5 15.2,27 17,21.5 12.5,18 18,18"
            fill={variantNum === 1 ? "#FACC15" : variantNum === 2 ? "#10B981" : "#94A3B8"}
          />
          <circle cx="20" cy="20.5" r="1.2" fill="#FFFFFF" />
        </svg>
      );

    case "falcon":
    default:
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Feather Crest */}
          <polygon points="16,8 20,4 21,11" fill="#78350F" />
          <polygon points="20,7 24,5 23,12" fill="#78350F" />
          {/* Head */}
          <ellipse cx="20" cy="20" rx="12" ry="11" fill="#F59E0B" />
          {/* Sharp Curved Beak */}
          <path d="M17 21 C20 21, 23 21, 23 24 C23 28, 19 28, 17 26 Z" fill="#FACC15" stroke="#B45309" strokeWidth="0.8" />
          {/* Raptor Eye */}
          <circle cx="15" cy="18" r="3" fill="#1C1917" />
          <circle cx="25" cy="18" r="3" fill="#1C1917" />
          <circle cx="15" cy="18" r="1.5" fill="#F59E0B" />
          <circle cx="25" cy="18" r="1.5" fill="#F59E0B" />
          <circle cx="14.5" cy="17.5" r="0.6" fill="#FFFFFF" />
          <circle cx="24.5" cy="17.5" r="0.6" fill="#FFFFFF" />
        </svg>
      );
  }
}

/**
 * Smart automatic fallback if none is chosen
 */
export function detectVaultAvatar(title = "", category = "", url = ""): string {
  const t = (title + " " + category + " " + url).toLowerCase();

  if (t.includes("chief") || t.includes("master") || t.includes("admin") || t.includes("security")) return "chief-1";
  if (t.includes("marshal") || t.includes("crown") || t.includes("royal") || t.includes("google")) return "marshal-1";
  if (t.includes("vanguard") || t.includes("diamond") || t.includes("aws") || t.includes("cloud")) return "vanguard-1";
  if (t.includes("centurion") || t.includes("tax") || t.includes("irs") || t.includes("verify") || t.includes("uscis")) return "centurion-1";
  if (t.includes("navigator") || t.includes("compass") || t.includes("map") || t.includes("web")) return "navigator-1";
  if (t.includes("sentinel") || t.includes("armor") || t.includes("hex") || t.includes("shield")) return "sentinel-1";
  if (t.includes("leopard")) return "leopard-1";
  if (t.includes("quickbooks") || t.includes("lion") || t.includes("intuit") || t.includes("accounting")) return "lion-1";
  if (t.includes("paychex") || t.includes("adp") || t.includes("payroll") || t.includes("bank")) return "chief-2";
  if (t.includes("owl") || t.includes("night")) return "owl-1";
  if (t.includes("falcon") || t.includes("eagle")) return "falcon-1";

  // Pick deterministic based on title hash
  let sum = 0;
  for (let i = 0; i < t.length; i++) {
    sum += t.charCodeAt(i);
  }
  const pickedFamily = VAULT_AVATAR_FAMILIES[sum % VAULT_AVATAR_FAMILIES.length];
  return pickedFamily.variants[0].id;
}

interface VaultBrandAvatarProps {
  iconId?: string;
  title?: string;
  category?: string;
  url?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VaultBrandAvatar({
  iconId,
  title = "",
  category = "",
  url = "",
  size = "md",
  className = "",
}: VaultBrandAvatarProps) {
  // If iconId matches one of our 30 avatars, use it; else detect one
  let avatar = ALL_VAULT_AVATARS.find((a) => a.id === iconId);
  if (!avatar) {
    const fallbackId = detectVaultAvatar(title, category, url);
    avatar = ALL_VAULT_AVATARS.find((a) => a.id === fallbackId) || ALL_VAULT_AVATARS[0];
  }

  const sizeClasses =
    size === "sm"
      ? "w-8 h-8 rounded-xl"
      : size === "lg"
      ? "w-14 h-14 rounded-2xl"
      : "w-11 h-11 rounded-2xl";

  const badgeSizeClasses =
    size === "sm"
      ? "w-3.5 h-3.5 text-[8px] -bottom-1 -right-1"
      : size === "lg"
      ? "w-5 h-5 text-[10px] -bottom-1 -right-1"
      : "w-4 h-4 text-[9px] -bottom-1 -right-1";

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center p-1 bg-gradient-to-br ${avatar.bgGradient} border ${avatar.borderClass} shadow-md transition-all duration-200 ${sizeClasses} ${className}`}
      title={`${avatar.label} (${avatar.themeName})`}
    >
      {/* Mascot Graphic */}
      <div className="w-full h-full flex items-center justify-center">
        {renderMascotFace(avatar.familyId, avatar.variantNumber)}
      </div>

      {/* Variation Number Pill Badge */}
      <div
        className={`absolute rounded-full font-black flex items-center justify-center shadow-xs border border-white/60 ${avatar.badgeBg} ${badgeSizeClasses}`}
      >
        {avatar.variantNumber}
      </div>
    </div>
  );
}

interface VaultIconPickerProps {
  selectedIcon: string;
  onSelect: (iconId: string) => void;
  detectedFallback?: string;
}

export function VaultIconPicker({
  selectedIcon,
  onSelect,
  detectedFallback = "chief-1",
}: VaultIconPickerProps) {
  const currentAvatar =
    ALL_VAULT_AVATARS.find((a) => a.id === selectedIcon) ||
    ALL_VAULT_AVATARS.find((a) => a.id === detectedFallback) ||
    ALL_VAULT_AVATARS[0];

  const currentFamily =
    VAULT_AVATAR_FAMILIES.find((f) => f.familyId === currentAvatar.familyId) ||
    VAULT_AVATAR_FAMILIES[0];

  return (
    <div className="space-y-3.5 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 tracking-tight">
          Login Crest & Insignia (Pick one for instant recognition)
        </span>
        {selectedIcon && (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Auto-Detect
          </button>
        )}
      </div>

      {/* Floating Variation Popover (Directly Above Selected Family) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-3 sm:p-3.5 shadow-xl border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <VaultBrandAvatar iconId={currentAvatar.id} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                {currentFamily.familyName}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
                Variation #{currentAvatar.variantNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentAvatar.themeName} theme • Tap variation below
            </p>
          </div>
        </div>

        {/* 3 Variation Selection Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/70 w-full sm:w-auto justify-end shrink-0">
          <span className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider hidden sm:inline">
            Pick Variation:
          </span>
          {currentFamily.variants.map((v) => {
            const isCurrentVariant = currentAvatar.id === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v.id)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  isCurrentVariant
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/80"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${v.badgeBg}`} />
                <span>#{v.variantNumber}</span>
                <span className="text-[10px] font-medium opacity-85 hidden md:inline">
                  {v.themeName.split("/")[0].trim()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Scroll Track (Swipe Right) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-0.5">
          <span>Choose Crest (Swipe right to view all 10):</span>
          <span className="text-blue-600 font-bold flex items-center gap-1 text-[11px]">
            <span>← Scroll / Swipe →</span>
          </span>
        </div>

        <div className="flex items-center gap-3.5 overflow-x-auto py-2.5 px-1 scrollbar-thin scrollbar-thumb-slate-300">
          {VAULT_AVATAR_FAMILIES.map((family) => {
            const isSelected = family.familyId === currentFamily.familyId;
            const displayVariant = isSelected ? currentAvatar : family.variants[0];

            return (
              <button
                key={family.familyId}
                type="button"
                onClick={() => onSelect(displayVariant.id)}
                className={`group flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all cursor-pointer shrink-0 active:scale-95 ${
                  isSelected
                    ? "bg-blue-50/90 border-2 border-blue-600 shadow-md shadow-blue-500/15 scale-105"
                    : "bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80"
                }`}
                title={family.description}
              >
                <div className="relative">
                  <VaultBrandAvatar iconId={displayVariant.id} size="lg" />
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span
                  className={`text-xs font-bold tracking-tight truncate max-w-[76px] ${
                    isSelected ? "text-blue-700 font-extrabold" : "text-slate-700 group-hover:text-slate-900"
                  }`}
                >
                  {family.familyName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
