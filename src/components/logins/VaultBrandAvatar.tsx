"use client";

import React from "react";
import {
  Landmark,
  Building2,
  Mail,
  Database,
  Server,
  Shield,
  KeyRound,
  Briefcase,
  ShoppingBag,
  Terminal,
  Globe,
  Wifi,
  Sparkles,
  CreditCard,
  Scale,
  Cloud,
  Layers,
  Lock,
  Cpu,
  FileText,
  UserCheck,
  Check,
} from "lucide-react";

export interface VaultIconPreset {
  id: string;
  name: string;
  badgeBg: string;
  badgeBorder: string;
  renderIcon: (className?: string) => React.ReactNode;
}

export const VAULT_ICON_PRESETS: VaultIconPreset[] = [
  {
    id: "google",
    name: "Google / Workspace",
    badgeBg: "bg-white",
    badgeBorder: "border-slate-200 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => (
      <svg className={cls} viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
    ),
  },
  {
    id: "microsoft",
    name: "Microsoft / Office",
    badgeBg: "bg-white",
    badgeBorder: "border-slate-200 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => (
      <svg className={cls} viewBox="0 0 24 24">
        <path fill="#F25022" d="M2 2h9v9H2z" />
        <path fill="#7FBA00" d="M13 2h9v9h-9z" />
        <path fill="#00A4EF" d="M2 13h9v9H2z" />
        <path fill="#FFB900" d="M13 13h9v9h-9z" />
      </svg>
    ),
  },
  {
    id: "apple",
    name: "Apple / iCloud",
    badgeBg: "bg-slate-900 text-white",
    badgeBorder: "border-slate-800 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.6-.74 1.01-1.77.9-2.8-.88.04-1.95.59-2.58 1.33-.56.64-.99 1.68-.86 2.69.98.08 1.95-.49 2.54-1.22z" />
      </svg>
    ),
  },
  {
    id: "github",
    name: "GitHub / Code",
    badgeBg: "bg-[#24292e] text-white",
    badgeBorder: "border-slate-800 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </svg>
    ),
  },
  {
    id: "aws",
    name: "AWS / Cloud",
    badgeBg: "bg-[#232F3E] text-[#FF9900]",
    badgeBorder: "border-slate-800 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.77 15.68c-2.33 1.72-5.7 2.64-8.63 2.64-4.11 0-7.81-1.5-10.6-4.02-.22-.2-.02-.47.24-.32 3.01 1.74 6.74 2.79 10.59 2.79 2.6 0 5.48-.6 8.11-1.85.39-.19.7.27.29.76z" />
        <path d="M19.78 14.54c-.3-.38-1.95-.18-2.7-.09-.23.03-.26-.16-.06-.31 1.35-.95 3.56-.68 3.82-.36.26.31-.07 2.55-1.35 3.58-.2.16-.38.07-.29-.14.28-.71.88-2.3.58-2.68z" />
        <path d="M12.98 5.75c-.32-.23-.74-.35-1.27-.35-.86 0-1.58.33-2.17.98-.59.66-.88 1.55-.88 2.67 0 1.13.29 2.01.88 2.66.59.64 1.31.96 2.17.96.53 0 .95-.12 1.27-.35.32-.24.53-.58.63-1.02h1.6c-.15.89-.55 1.59-1.2 2.1-.65.51-1.46.77-2.42.77-1.38 0-2.52-.51-3.41-1.52-.89-1.02-1.33-2.32-1.33-3.92 0-1.6.44-2.9 1.33-3.91.89-1.02 2.03-1.52 3.41-1.52.96 0 1.77.26 2.42.77.65.51 1.05 1.21 1.2 2.1h-1.6c-.1-.44-.31-.78-.63-1.02z" />
      </svg>
    ),
  },
  {
    id: "stripe",
    name: "Stripe / Payments",
    badgeBg: "bg-[#635BFF] text-white",
    badgeBorder: "border-[#5349e5] shadow-xs",
    renderIcon: (cls = "w-5 h-5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.977 15.617.5 12.378.5 6.88.5 3.12 3.447 3.12 8.188c0 3.734 2.554 5.86 6.945 7.492 2.617.973 3.512 1.662 3.512 2.673 0 .99-.806 1.48-2.213 1.48-2.041 0-4.858-.946-6.84-2.106l-.92 5.578c1.92.83 4.887 1.495 7.64 1.495 5.762 0 9.756-2.735 9.756-7.814 0-4.017-2.617-5.918-7.023-7.836z" />
      </svg>
    ),
  },
  {
    id: "slack",
    name: "Slack / Teams",
    badgeBg: "bg-[#4A154B] text-white",
    badgeBorder: "border-[#3d113e] shadow-xs",
    renderIcon: (cls = "w-5 h-5") => (
      <svg className={cls} viewBox="0 0 24 24">
        <path
          fill="#E01E5A"
          d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        />
        <path
          fill="#36C5F0"
          d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        />
        <path
          fill="#2EB67D"
          d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        />
        <path
          fill="#ECB22E"
          d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        />
      </svg>
    ),
  },
  {
    id: "bank",
    name: "Banking & Payroll",
    badgeBg: "bg-emerald-50 text-emerald-600",
    badgeBorder: "border-emerald-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Landmark className={cls} />,
  },
  {
    id: "tax",
    name: "Tax & Government",
    badgeBg: "bg-amber-50 text-amber-700",
    badgeBorder: "border-amber-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Scale className={cls} />,
  },
  {
    id: "mail",
    name: "Corporate Email",
    badgeBg: "bg-sky-50 text-sky-600",
    badgeBorder: "border-sky-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Mail className={cls} />,
  },
  {
    id: "database",
    name: "Database / Cloud DB",
    badgeBg: "bg-cyan-50 text-cyan-700",
    badgeBorder: "border-cyan-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Database className={cls} />,
  },
  {
    id: "server",
    name: "Server & Hosting",
    badgeBg: "bg-indigo-50 text-indigo-600",
    badgeBorder: "border-indigo-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Server className={cls} />,
  },
  {
    id: "shield",
    name: "Security & VPN",
    badgeBg: "bg-rose-50 text-rose-600",
    badgeBorder: "border-rose-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Shield className={cls} />,
  },
  {
    id: "key",
    name: "Master Key & SSO",
    badgeBg: "bg-amber-50 text-amber-600",
    badgeBorder: "border-amber-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <KeyRound className={cls} />,
  },
  {
    id: "briefcase",
    name: "HR & Client Portal",
    badgeBg: "bg-blue-50 text-blue-600",
    badgeBorder: "border-blue-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Briefcase className={cls} />,
  },
  {
    id: "ecommerce",
    name: "Vendors & Commerce",
    badgeBg: "bg-orange-50 text-orange-600",
    badgeBorder: "border-orange-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <ShoppingBag className={cls} />,
  },
  {
    id: "terminal",
    name: "DevOps & Terminal",
    badgeBg: "bg-slate-900 text-emerald-400",
    badgeBorder: "border-slate-800 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Terminal className={cls} />,
  },
  {
    id: "globe",
    name: "Web & Global Portal",
    badgeBg: "bg-slate-100 text-slate-700",
    badgeBorder: "border-slate-200 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Globe className={cls} />,
  },
  {
    id: "wifi",
    name: "Network & DNS",
    badgeBg: "bg-teal-50 text-teal-600",
    badgeBorder: "border-teal-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Wifi className={cls} />,
  },
  {
    id: "sparkles",
    name: "AI & Modern Tools",
    badgeBg: "bg-purple-50 text-purple-600",
    badgeBorder: "border-purple-200/90 shadow-xs",
    renderIcon: (cls = "w-5 h-5") => <Sparkles className={cls} />,
  },
];

/**
 * Intelligent auto-detection for icons based on item title, category, and url.
 */
export function detectVaultIcon(
  title = "",
  category = "",
  url = ""
): string {
  const t = (title + " " + url).toLowerCase();
  const c = category.toLowerCase();

  if (t.includes("google") || t.includes("workspace") || t.includes("gmail")) return "google";
  if (t.includes("microsoft") || t.includes("azure") || t.includes("office") || t.includes("outlook") || t.includes("o365")) return "microsoft";
  if (t.includes("apple") || t.includes("icloud")) return "apple";
  if (t.includes("github") || t.includes("gitlab") || t.includes("git")) return "github";
  if (t.includes("aws") || t.includes("amazon web") || t.includes("s3") || t.includes("ec2")) return "aws";
  if (t.includes("stripe") || t.includes("paypal") || t.includes("square")) return "stripe";
  if (t.includes("slack") || t.includes("discord") || t.includes("zoom")) return "slack";
  if (t.includes("adp") || t.includes("payroll") || t.includes("bank") || t.includes("chase") || t.includes("wells") || t.includes("bofa") || t.includes("fidelity")) return "bank";
  if (t.includes("e-verify") || t.includes("uscis") || t.includes("irs") || t.includes("tax") || t.includes("gov")) return "tax";
  if (t.includes("supabase") || t.includes("postgres") || t.includes("database") || t.includes("mysql") || t.includes("redis")) return "database";
  if (t.includes("vercel") || t.includes("server") || t.includes("digitalocean") || t.includes("cloudflare") || t.includes("linode")) return "server";
  if (t.includes("vpn") || t.includes("1password") || t.includes("bitwarden") || t.includes("security") || t.includes("auth")) return "shield";
  if (t.includes("okta") || t.includes("auth0") || t.includes("sso") || t.includes("passkey") || t.includes("key")) return "key";
  if (t.includes("shopify") || t.includes("amazon") || t.includes("vendor") || t.includes("store")) return "ecommerce";
  if (t.includes("ssh") || t.includes("terminal") || t.includes("cli") || t.includes("devops")) return "terminal";

  // Category fallback
  if (c.includes("email")) return "mail";
  if (c.includes("banking") || c.includes("payroll")) return "bank";
  if (c.includes("tax") || c.includes("government")) return "tax";
  if (c.includes("client") || c.includes("vendor")) return "briefcase";
  return "globe";
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
  const finalId = iconId || detectVaultIcon(title, category, url);
  const preset = VAULT_ICON_PRESETS.find((p) => p.id === finalId) || VAULT_ICON_PRESETS[VAULT_ICON_PRESETS.length - 1];

  const sizeClasses =
    size === "sm"
      ? "w-8 h-8 rounded-lg text-xs"
      : size === "lg"
      ? "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-base"
      : "w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-sm";

  const iconSizeClasses =
    size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6 sm:w-7 sm:h-7" : "w-5 h-5";

  return (
    <div
      className={`shrink-0 flex items-center justify-center border transition-all duration-200 ${sizeClasses} ${preset.badgeBg} ${preset.badgeBorder} ${className}`}
      title={preset.name}
    >
      {preset.renderIcon(iconSizeClasses)}
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
  detectedFallback = "globe",
}: VaultIconPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-slate-800 flex items-center gap-1.5">
          <span>Login Avatar & Icon</span>
          <span className="text-[10px] font-normal text-slate-400">
            (Pick an icon for instant visual recognition)
          </span>
        </label>
        {selectedIcon && (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Reset to Auto
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-2 bg-slate-50/80 rounded-2xl border border-slate-200/80 max-h-40 overflow-y-auto scrollbar-thin">
        {VAULT_ICON_PRESETS.map((preset) => {
          const isSelected = selectedIcon === preset.id || (!selectedIcon && preset.id === detectedFallback);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer group active:scale-95 ${
                isSelected
                  ? "bg-white shadow-md ring-2 ring-blue-600 border border-blue-200 scale-105 z-10"
                  : "hover:bg-white/80 hover:shadow-xs border border-transparent"
              }`}
              title={preset.name}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${preset.badgeBg} ${preset.badgeBorder}`}
              >
                {preset.renderIcon("w-4 h-4")}
              </div>
              <span className="text-[9px] font-semibold text-slate-600 truncate max-w-[50px] mt-1 group-hover:text-blue-600">
                {preset.name.split("/")[0].trim()}
              </span>
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
  );
}
