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
    familyId: "bot",
    familyName: "Cyber Bot",
    description: "High-tech robotic unit with visor",
    variants: [
      {
        id: "bot-1",
        familyId: "bot",
        familyName: "Cyber Bot",
        variantNumber: 1,
        label: "Bot Unit-01",
        themeName: "Neon Cyan",
        bgGradient: "from-sky-400 via-blue-600 to-slate-950",
        borderClass: "border-sky-300/80 shadow-sky-500/15",
        accentColor: "#38BDF8",
        badgeBg: "bg-blue-700 text-blue-50",
      },
      {
        id: "bot-2",
        familyId: "bot",
        familyName: "Cyber Bot",
        variantNumber: 2,
        label: "Bot Unit-02",
        themeName: "Neon Violet",
        bgGradient: "from-fuchsia-400 via-purple-600 to-slate-950",
        borderClass: "border-fuchsia-300/80 shadow-fuchsia-500/15",
        accentColor: "#C084FC",
        badgeBg: "bg-purple-800 text-purple-50",
      },
      {
        id: "bot-3",
        familyId: "bot",
        familyName: "Cyber Bot",
        variantNumber: 3,
        label: "Bot Unit-03",
        themeName: "Solar Amber",
        bgGradient: "from-amber-400 via-orange-600 to-slate-950",
        borderClass: "border-amber-300/80 shadow-amber-500/15",
        accentColor: "#FB923C",
        badgeBg: "bg-orange-700 text-orange-50",
      },
    ],
  },
  {
    familyId: "fox",
    familyName: "Fox",
    description: "Cunning fox with sharp ears",
    variants: [
      {
        id: "fox-1",
        familyId: "fox",
        familyName: "Fox",
        variantNumber: 1,
        label: "Fox Blaze",
        themeName: "Blaze Orange",
        bgGradient: "from-orange-400 via-amber-600 to-red-700",
        borderClass: "border-orange-300/80 shadow-orange-500/15",
        accentColor: "#F97316",
        badgeBg: "bg-orange-700 text-orange-50",
      },
      {
        id: "fox-2",
        familyId: "fox",
        familyName: "Fox",
        variantNumber: 2,
        label: "Fox Arctic",
        themeName: "Ice Frost",
        bgGradient: "from-blue-200 via-cyan-400 to-slate-800",
        borderClass: "border-blue-200/80 shadow-blue-500/15",
        accentColor: "#67E8F9",
        badgeBg: "bg-cyan-800 text-cyan-50",
      },
      {
        id: "fox-3",
        familyId: "fox",
        familyName: "Fox",
        variantNumber: 3,
        label: "Fox Shadow",
        themeName: "Midnight Violet",
        bgGradient: "from-violet-400 via-indigo-700 to-slate-950",
        borderClass: "border-violet-300/80 shadow-violet-500/15",
        accentColor: "#A78BFA",
        badgeBg: "bg-indigo-800 text-indigo-50",
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
    familyId: "chief",
    familyName: "Commander",
    description: "Star commander crest badge",
    variants: [
      {
        id: "chief-1",
        familyId: "chief",
        familyName: "Commander",
        variantNumber: 1,
        label: "Chief Prime",
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
        label: "Chief Tactical",
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
        label: "Chief Stealth",
        themeName: "Obsidian Star",
        bgGradient: "from-slate-600 via-zinc-800 to-black",
        borderClass: "border-slate-500/80 shadow-slate-900/20",
        accentColor: "#94A3B8",
        badgeBg: "bg-zinc-900 text-white",
      },
    ],
  },
  {
    familyId: "cosmo",
    familyName: "Cosmonaut",
    description: "Astronaut helmet in deep space",
    variants: [
      {
        id: "cosmo-1",
        familyId: "cosmo",
        familyName: "Cosmonaut",
        variantNumber: 1,
        label: "Cosmo Lunar",
        themeName: "Cyan Starlight",
        bgGradient: "from-sky-300 via-blue-500 to-indigo-950",
        borderClass: "border-sky-300/80 shadow-sky-500/15",
        accentColor: "#38BDF8",
        badgeBg: "bg-sky-800 text-sky-50",
      },
      {
        id: "cosmo-2",
        familyId: "cosmo",
        familyName: "Cosmonaut",
        variantNumber: 2,
        label: "Cosmo Mars",
        themeName: "Solar Flare",
        bgGradient: "from-orange-400 via-rose-600 to-purple-950",
        borderClass: "border-orange-300/80 shadow-orange-500/15",
        accentColor: "#FB923C",
        badgeBg: "bg-rose-800 text-rose-50",
      },
      {
        id: "cosmo-3",
        familyId: "cosmo",
        familyName: "Cosmonaut",
        variantNumber: 3,
        label: "Cosmo Deep",
        themeName: "Nebula Violet",
        bgGradient: "from-pink-400 via-purple-600 to-slate-950",
        borderClass: "border-pink-300/80 shadow-pink-500/15",
        accentColor: "#F472B6",
        badgeBg: "bg-purple-900 text-purple-50",
      },
    ],
  },
  {
    familyId: "ninja",
    familyName: "Ninja",
    description: "Shadow shinobi with focus gaze",
    variants: [
      {
        id: "ninja-1",
        familyId: "ninja",
        familyName: "Ninja",
        variantNumber: 1,
        label: "Ninja Crimson",
        themeName: "Crimson Shadow",
        bgGradient: "from-red-500 via-rose-700 to-black",
        borderClass: "border-red-400/80 shadow-red-500/15",
        accentColor: "#EF4444",
        badgeBg: "bg-red-800 text-red-50",
      },
      {
        id: "ninja-2",
        familyId: "ninja",
        familyName: "Ninja",
        variantNumber: 2,
        label: "Ninja Cobalt",
        themeName: "Midnight Cobalt",
        bgGradient: "from-blue-500 via-cyan-700 to-black",
        borderClass: "border-blue-400/80 shadow-blue-500/15",
        accentColor: "#3B82F6",
        badgeBg: "bg-blue-900 text-blue-50",
      },
      {
        id: "ninja-3",
        familyId: "ninja",
        familyName: "Ninja",
        variantNumber: 3,
        label: "Ninja Gold",
        themeName: "Golden Blade",
        bgGradient: "from-amber-400 via-stone-800 to-black",
        borderClass: "border-amber-300/80 shadow-amber-500/15",
        accentColor: "#F59E0B",
        badgeBg: "bg-stone-900 text-amber-300",
      },
    ],
  },
  {
    familyId: "dragon",
    familyName: "Dragon",
    description: "Mythical wyrm with ancient flame",
    variants: [
      {
        id: "dragon-1",
        familyId: "dragon",
        familyName: "Dragon",
        variantNumber: 1,
        label: "Dragon Flame",
        themeName: "Ruby Inferno",
        bgGradient: "from-rose-500 via-orange-600 to-amber-900",
        borderClass: "border-rose-300/80 shadow-rose-500/15",
        accentColor: "#FB7185",
        badgeBg: "bg-red-800 text-red-50",
      },
      {
        id: "dragon-2",
        familyId: "dragon",
        familyName: "Dragon",
        variantNumber: 2,
        label: "Dragon Jade",
        themeName: "Jade Wyrm",
        bgGradient: "from-emerald-400 via-teal-700 to-slate-900",
        borderClass: "border-emerald-300/80 shadow-emerald-500/15",
        accentColor: "#34D399",
        badgeBg: "bg-emerald-900 text-emerald-50",
      },
      {
        id: "dragon-3",
        familyId: "dragon",
        familyName: "Dragon",
        variantNumber: 3,
        label: "Dragon Void",
        themeName: "Storm Sapphire",
        bgGradient: "from-indigo-400 via-purple-700 to-slate-950",
        borderClass: "border-indigo-300/80 shadow-indigo-500/15",
        accentColor: "#A5B4FC",
        badgeBg: "bg-indigo-900 text-indigo-50",
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

    case "bot":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Antenna */}
          <line x1="20" y1="6" x2="20" y2="10" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="5" r="2.2" fill={variantNum === 1 ? "#38BDF8" : variantNum === 2 ? "#C084FC" : "#FB923C"} />
          {/* Head Chassis */}
          <rect x="9" y="10" width="22" height="20" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          {/* Ear Bolts */}
          <rect x="6" y="16" width="3" height="8" rx="1.5" fill="#64748B" />
          <rect x="31" y="16" width="3" height="8" rx="1.5" fill="#64748B" />
          {/* Glowing Visor Screen */}
          <rect
            x="12"
            y="14"
            width="16"
            height="8"
            rx="3"
            fill={variantNum === 1 ? "#0284C7" : variantNum === 2 ? "#7E22CE" : "#C2410C"}
          />
          {/* Eye Pixels / Scanning Line */}
          <ellipse cx="16" cy="18" rx="2" ry="1.5" fill="#FFFFFF" />
          <ellipse cx="24" cy="18" rx="2" ry="1.5" fill="#FFFFFF" />
          {/* Mouth Grille */}
          <line x1="15" y1="25" x2="25" y2="25" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="2 1" />
        </svg>
      );

    case "fox":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Pointy Ears */}
          <polygon points="10,8 18,17 7,18" fill="#C2410C" />
          <polygon points="10,10 16,16 8,17" fill="#FDBA74" />
          <polygon points="30,8 22,17 33,18" fill="#C2410C" />
          <polygon points="30,10 24,16 32,17" fill="#FDBA74" />
          {/* Head Triangle */}
          <polygon points="20,30 7,16 33,16" fill="#EA580C" />
          {/* White Cheeks */}
          <polygon points="20,30 7,16 14,23" fill="#FFFFFF" />
          <polygon points="20,30 33,16 26,23" fill="#FFFFFF" />
          {/* Eyes */}
          <polygon points="14,19 18,20 15,22" fill="#0F172A" />
          <polygon points="26,19 22,20 25,22" fill="#0F172A" />
          {/* Dark Nose Tip */}
          <circle cx="20" cy="28.5" r="1.8" fill="#0F172A" />
        </svg>
      );

    case "owl":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Ear Tufts */}
          <polygon points="11,8 17,14 9,16" fill="#065F46" />
          <polygon points="29,8 23,14 31,16" fill="#065F46" />
          {/* Head Body */}
          <ellipse cx="20" cy="22" rx="13" ry="12" fill="#047857" />
          <ellipse cx="20" cy="24" rx="10" ry="9" fill="#A7F3D0" />
          {/* Big Owl Eyes */}
          <circle cx="15" cy="19" r="4.2" fill="#FFFFFF" stroke="#064E3B" strokeWidth="1" />
          <circle cx="25" cy="19" r="4.2" fill="#FFFFFF" stroke="#064E3B" strokeWidth="1" />
          <circle cx="15" cy="19" r="2.2" fill="#0F172A" />
          <circle cx="25" cy="19" r="2.2" fill="#0F172A" />
          <circle cx="14" cy="18" r="0.8" fill="#FFFFFF" />
          <circle cx="24" cy="18" r="0.8" fill="#FFFFFF" />
          {/* Sharp Beak */}
          <polygon points="18.5,21.5 21.5,21.5 20,25.5" fill="#F59E0B" />
        </svg>
      );

    case "chief":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Shield Emblem Outline */}
          <path d="M20 7 L32 12 L32 24 C32 30 20 35 20 35 C20 35 8 30 8 24 L8 12 Z" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
          {/* Inner Plate */}
          <path d="M20 10 L29 14 L29 23 C29 28 20 32 20 32 C20 32 11 28 11 23 L11 14 Z" fill="#0F172A" />
          {/* Commander Gold Star */}
          <polygon points="20,13 22,18 27,18 23,21 24.5,26 20,23 15.5,26 17,21 13,18 18,18" fill="#FBBF24" />
          {/* Star Highlight */}
          <circle cx="20" cy="20" r="1.5" fill="#FEF08A" />
        </svg>
      );

    case "cosmo":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Outer Helmet */}
          <circle cx="20" cy="21" r="13" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
          {/* Glossy Visor */}
          <ellipse cx="20" cy="21" rx="9" ry="7" fill="#0284C7" />
          {/* Reflection Wave */}
          <path d="M14 18 C17 16, 23 16, 26 18 C24 20, 16 20, 14 18 Z" fill="#BAE6FD" opacity="0.7" />
          <circle cx="15" cy="22" r="1" fill="#FFFFFF" opacity="0.8" />
          {/* Chin Mic */}
          <rect x="18" y="29.5" width="4" height="2" rx="1" fill="#64748B" />
        </svg>
      );

    case "ninja":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Hood */}
          <circle cx="20" cy="21" r="13" fill="#0F172A" />
          {/* Headband */}
          <rect x="9" y="12" width="22" height="4.5" rx="1.5" fill="#DC2626" />
          <circle cx="20" cy="14.2" r="1.2" fill="#FEF08A" />
          {/* Eye Opening Slit */}
          <ellipse cx="20" cy="20.5" rx="8" ry="3.2" fill="#FED7AA" />
          {/* Fierce Eyes */}
          <polygon points="14,20 18,20.5 15,21.5" fill="#0F172A" />
          <polygon points="26,20 22,20.5 25,21.5" fill="#0F172A" />
          <circle cx="16" cy="20.5" r="0.5" fill="#FFFFFF" />
          <circle cx="24" cy="20.5" r="0.5" fill="#FFFFFF" />
          {/* Mask Wrap Bottom */}
          <path d="M9 22 C13 25, 27 25, 31 22 C31 29, 27 34, 20 34 C13 34, 9 29, 9 22 Z" fill="#0F172A" />
        </svg>
      );

    case "dragon":
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm">
          {/* Horns */}
          <path d="M12 14 C8 6, 17 8, 16 13 Z" fill="#EA580C" />
          <path d="M28 14 C32 6, 23 8, 24 13 Z" fill="#EA580C" />
          {/* Head */}
          <ellipse cx="20" cy="22" rx="12" ry="10" fill="#BE123C" />
          {/* Brow Scale */}
          <path d="M12 17 C16 15, 24 15, 28 17" stroke="#881337" strokeWidth="1.5" fill="none" />
          {/* Slit Dragon Eyes */}
          <ellipse cx="15" cy="20" rx="2.5" ry="3.5" fill="#FACC15" />
          <ellipse cx="25" cy="20" rx="2.5" ry="3.5" fill="#FACC15" />
          <line x1="15" y1="17.5" x2="15" y2="22.5" stroke="#000000" strokeWidth="1.2" />
          <line x1="25" y1="17.5" x2="25" y2="22.5" stroke="#000000" strokeWidth="1.2" />
          {/* Nostrils with Smoke Spurt */}
          <ellipse cx="18" cy="26" rx="1" ry="1.5" fill="#4C0519" />
          <ellipse cx="22" cy="26" rx="1" ry="1.5" fill="#4C0519" />
          <circle cx="20" cy="29" r="1.2" fill="#F97316" />
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

  if (t.includes("leopard")) return "leopard-1";
  if (t.includes("quickbooks") || t.includes("intuit") || t.includes("accounting")) return "lion-1";
  if (t.includes("paychex") || t.includes("adp") || t.includes("payroll")) return "bot-1";
  if (t.includes("chief") || t.includes("master") || t.includes("admin")) return "chief-1";
  if (t.includes("google") || t.includes("workspace") || t.includes("mail")) return "fox-1";
  if (t.includes("security") || t.includes("verify") || t.includes("tax") || t.includes("irs")) return "owl-1";
  if (t.includes("aws") || t.includes("cloud") || t.includes("space") || t.includes("azure")) return "cosmo-1";
  if (t.includes("git") || t.includes("code") || t.includes("dev") || t.includes("terminal")) return "ninja-1";
  if (t.includes("bank") || t.includes("stripe") || t.includes("vault")) return "dragon-1";

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
  detectedFallback = "leopard-1",
}: VaultIconPickerProps) {
  const currentAvatar =
    ALL_VAULT_AVATARS.find((a) => a.id === selectedIcon) ||
    ALL_VAULT_AVATARS.find((a) => a.id === detectedFallback) ||
    ALL_VAULT_AVATARS[0];

  return (
    <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
      {/* Header with preview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <VaultBrandAvatar iconId={currentAvatar.id} size="md" />
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{currentAvatar.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 font-extrabold">
                Variation #{currentAvatar.variantNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">{currentAvatar.themeName} theme</p>
          </div>
        </div>

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

      <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between border-t border-slate-200/60 pt-2.5">
        <span>Select Mascot Persona & Variation (3 variations per persona for multiple accounts)</span>
      </div>

      {/* Grid of 10 Character Families × 3 Variations */}
      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
        {VAULT_AVATAR_FAMILIES.map((family) => (
          <div
            key={family.familyId}
            className="flex items-center justify-between gap-3 p-2 bg-white rounded-xl border border-slate-200/70 hover:border-slate-300 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-800 block truncate">
                {family.familyName}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {family.description}
              </span>
            </div>

            {/* 3 Variations */}
            <div className="flex items-center gap-2 shrink-0">
              {family.variants.map((v) => {
                const isSelected = selectedIcon === v.id || (!selectedIcon && v.id === detectedFallback);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSelect(v.id)}
                    className={`group relative p-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-md z-10"
                        : "hover:scale-105 opacity-85 hover:opacity-100"
                    }`}
                    title={`${v.label} (${v.themeName}) - Variant #${v.variantNumber}`}
                  >
                    <VaultBrandAvatar iconId={v.id} size="sm" />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
