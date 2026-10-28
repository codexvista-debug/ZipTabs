"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth, getOrCreateSessionId } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getCountryFlag, getCountryName, fetchIpCountry, isLocalOrPrivateIp } from "@/lib/geo";
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Lock,
  Unlock,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Globe,
  Ban,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Search,
  Shield,
  Activity,
  Compass,
  Zap,
  Sparkles,
  LogOut,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Ghost,
} from "lucide-react";

interface AppUserRecord {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

interface IpAttemptHistoryItem {
  timestamp: string;
  username: string;
  userAgent?: string;
}

interface IpLockRecord {
  ip: string;
  country_code?: string | null;
  failed_attempts: number;
  locked_until: string | null;
  last_attempt_at: string | null;
  attempt_history?: IpAttemptHistoryItem[];
}

interface SiteVisitorRecord {
  ip: string;
  country_code?: string | null;
  visit_count: number;
  first_visited_at: string;
  last_visited_at: string;
  user_agent?: string;
  last_page?: string;
}

interface SystemSecuritySettings {
  id: string;
  registrations_allowed: boolean;
  ip_lockdown_enabled: boolean;
  vanish_mode_enabled?: boolean;
  allowed_ips: string[];
  blacklisted_ips: string[];
  updated_at?: string;
  updated_by?: string;
}

// Universal Cross-Platform Country Flag (Renders real graphical flags on Windows PC & Mobile)
function CountryFlagBadge({
  code,
  ip,
  className = "w-4 h-2.5",
}: {
  code?: string | null;
  ip?: string;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (ip && isLocalOrPrivateIp(ip)) {
    return <span className="select-none text-sm inline-block" title="Local Network">💻</span>;
  }

  const cleanCode = code && code.length === 2 ? code.toUpperCase() : null;
  const countryName = getCountryName(cleanCode, ip);

  if (!cleanCode) {
    return <span className="select-none text-sm inline-block" title="Unknown Location">🌐</span>;
  }

  const flagEmoji = getCountryFlag(cleanCode, ip);

  if (imgError) {
    return (
      <span className="select-none text-sm inline-block cursor-help" title={`${countryName} (${cleanCode})`}>
        {flagEmoji}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center shrink-0 cursor-help" title={`${countryName} (${cleanCode})`}>
      <img
        src={`https://flagcdn.com/w40/${cleanCode.toLowerCase()}.png`}
        srcSet={`https://flagcdn.com/w80/${cleanCode.toLowerCase()}.png 2x`}
        alt={cleanCode}
        className={`object-cover rounded-[2px] shadow-2xs border border-slate-300/80 shrink-0 select-none ${className}`}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    </span>
  );
}

export function MasterControlView() {
  const { user } = useAuth();
  const isChief = user?.username?.toLowerCase() === "chief";

  const [isLoading, setIsLoading] = useState(true);
  const [clientIp, setClientIp] = useState<string>("127.0.0.1");
  const [settings, setSettings] = useState<SystemSecuritySettings>({
    id: "global",
    registrations_allowed: false,
    ip_lockdown_enabled: false,
    allowed_ips: [],
    blacklisted_ips: [],
  });
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [ipLocks, setIpLocks] = useState<IpLockRecord[]>([]);
  const [visitors, setVisitors] = useState<SiteVisitorRecord[]>([]);

  // Country code cache mapping IP -> ISO Country (e.g. "IN", "US")
  const [countryMap, setCountryMap] = useState<Record<string, string>>({});

  // Search & Filter
  const [ipSearch, setIpSearch] = useState("");
  const [visitorSearch, setVisitorSearch] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Live real-time 1-second clock tick for instant relative time and active presence detection
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Manual actions
  const [customBlacklistIp, setCustomBlacklistIp] = useState("");
  const [customAllowedIp, setCustomAllowedIp] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  // Project-Style Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: React.ReactNode;
    confirmText: string;
    confirmVariant?: "danger" | "primary" | "warning" | "purple";
    icon?: "logout" | "trash" | "lock" | "warning" | "ghost";
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Premium Toast Notification State
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage((curr) => (curr?.text === text ? null : curr));
    }, 3200);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => {
      setCopiedText((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  // Fetch Master Control Data
  const loadMasterData = useCallback(async (isSilent = false) => {
    try {
      const res = await fetch("/api/master-control");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setClientIp(data.clientIp || "127.0.0.1");
          setSettings(data.settings);
          setUsers(data.users || []);
          setIpLocks(data.ipLocks || []);
          setVisitors(data.visitors || []);
        }
      }
    } catch (err) {
      console.error("Master Control load failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Background Country Resolver for IPs lacking country_code
  useEffect(() => {
    const allIps = [
      ...ipLocks.map((l) => ({ ip: l.ip, code: l.country_code })),
      ...visitors.map((v) => ({ ip: v.ip, code: v.country_code })),
      { ip: clientIp, code: null },
    ];

    allIps.forEach(async ({ ip, code }) => {
      if (!ip || isLocalOrPrivateIp(ip)) return;
      if (code) {
        setCountryMap((prev) => (prev[ip] ? prev : { ...prev, [ip]: code }));
        return;
      }
      if (!countryMap[ip]) {
        const resolved = await fetchIpCountry(ip);
        if (resolved) {
          setCountryMap((prev) => ({ ...prev, [ip]: resolved }));
        }
      }
    });
  }, [ipLocks, visitors, clientIp, countryMap]);

  // Real-time listener & Auto-refresh (Zero refresh button needed)
  useEffect(() => {
    if (!isChief) {
      setIsLoading(false);
      return;
    }

    loadMasterData();

    // 1. Supabase Realtime Subscription
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel("master_control_live_updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "site_visitors" },
          () => loadMasterData(true)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "auth_ip_locks" },
          () => loadMasterData(true)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "system_security_settings" },
          () => loadMasterData(true)
        )
        .subscribe();
    }

    // 2. High-frequency 3.5s background polling fallback
    const pollInterval = setInterval(() => {
      loadMasterData(true);
    }, 3500);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      clearInterval(pollInterval);
    };
  }, [isChief, loadMasterData]);

  // Ultra-Fast Optimistic Action Executor (0ms perceived latency)
  const executeActionOptimistic = async (
    payload: any,
    optimisticUpdate: () => void,
    rollbackUpdate: () => void,
    successMsg: string
  ) => {
    // 1. Instantly update UI optimistically
    optimisticUpdate();
    showNotification(successMsg, "success");

    // 2. Execute network request in background
    try {
      const res = await fetch("/api/master-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        rollbackUpdate();
        showNotification(data.error || "Action failed", "error");
      } else {
        // Sync silently in background
        loadMasterData(true);
      }
    } catch (err: any) {
      rollbackUpdate();
      showNotification(err.message || "Network error", "error");
    } finally {
      setPendingActionId(null);
    }
  };

  // 1. Toggle Registrations
  const handleToggleRegistrations = () => {
    const nextState = !settings.registrations_allowed;
    const prevState = settings.registrations_allowed;
    setPendingActionId("registrations");

    executeActionOptimistic(
      { action: "toggle_registrations", allowed: nextState },
      () => setSettings((prev) => ({ ...prev, registrations_allowed: nextState })),
      () => setSettings((prev) => ({ ...prev, registrations_allowed: prevState })),
      nextState ? "User registrations are now OPEN." : "Registrations PAUSED (Locked to 1 user)."
    );
  };

  // 2. Toggle Website Lockdown to Current IP
  const handleToggleLockdown = () => {
    const nextState = !settings.ip_lockdown_enabled;
    const prevState = settings.ip_lockdown_enabled;
    const prevAllowed = [...settings.allowed_ips];
    setPendingActionId("lockdown");

    executeActionOptimistic(
      { action: "toggle_lockdown", enabled: nextState },
      () =>
        setSettings((prev) => ({
          ...prev,
          ip_lockdown_enabled: nextState,
          allowed_ips: nextState && !prev.allowed_ips.includes(clientIp)
            ? [...prev.allowed_ips, clientIp]
            : prev.allowed_ips,
        })),
      () =>
        setSettings((prev) => ({
          ...prev,
          ip_lockdown_enabled: prevState,
          allowed_ips: prevAllowed,
        })),
      nextState
        ? `WEBSITE LOCKED DOWN: Access restricted strictly to IP ${clientIp}.`
        : "Website lockdown lifted. Standard IP monitoring active."
    );
  };

  // 2.1 Toggle Vanish Mode (Immediate eviction of non-whitelisted visitors to Wikipedia)
  const executeToggleVanishMode = (nextState: boolean) => {
    const prevState = Boolean(settings.vanish_mode_enabled);
    const prevAllowed = [...settings.allowed_ips];
    setPendingActionId("vanish");

    executeActionOptimistic(
      { action: "toggle_vanish_mode", enabled: nextState },
      () =>
        setSettings((prev) => ({
          ...prev,
          vanish_mode_enabled: nextState,
          allowed_ips: nextState && !prev.allowed_ips.includes(clientIp)
            ? [...prev.allowed_ips, clientIp]
            : prev.allowed_ips,
        })),
      () =>
        setSettings((prev) => ({
          ...prev,
          vanish_mode_enabled: prevState,
          allowed_ips: prevAllowed,
        })),
      nextState
        ? `VANISH MODE ACTIVATED: Non-whitelisted visitors are evicted to Wikipedia immediately.`
        : "Vanish Mode deactivated. Normal access restored."
    );
  };

  const handleToggleVanishMode = () => {
    const nextState = !settings.vanish_mode_enabled;
    if (nextState) {
      setConfirmDialog({
        title: "Activate Vanish Mode?",
        description: (
          <span>
            When Vanish Mode is active, <strong>any visitor visiting any part of this site</strong> whose IP is not on your whitelist will be <strong>instantly evicted and redirected to Wikipedia</strong> (<code className="text-purple-600 bg-purple-50 px-1 py-0.5 rounded font-mono text-[11px]">https://www.wikipedia.org</code>).
            <br /><br />
            They will never be able to access or remain on your website link at all. Your current IP (<strong className="text-slate-900">{clientIp}</strong>) will be kept whitelisted so you are never locked out.
          </span>
        ),
        confirmText: "Activate Vanish Mode",
        confirmVariant: "purple",
        icon: "ghost",
        onConfirm: () => {
          setConfirmDialog(null);
          executeToggleVanishMode(true);
        },
      });
    } else {
      executeToggleVanishMode(false);
    }
  };

  // 3. Blacklist an IP
  const executeBlacklistAction = (ip: string) => {
    setPendingActionId(`blacklist-${ip}`);
    const prevBlacklisted = [...settings.blacklisted_ips];
    const prevLocks = [...ipLocks];

    executeActionOptimistic(
      { action: "blacklist_ip", ip },
      () => {
        setSettings((prev) => ({
          ...prev,
          blacklisted_ips: Array.from(new Set([...prev.blacklisted_ips, ip])),
        }));
        setIpLocks((prev) => {
          const exists = prev.some((l) => l.ip === ip);
          if (exists) {
            return prev.map((l) =>
              l.ip === ip ? { ...l, failed_attempts: 3, locked_until: "2099-12-31T23:59:59Z" } : l
            );
          }
          return [
            {
              ip,
              failed_attempts: 3,
              locked_until: "2099-12-31T23:59:59Z",
              last_attempt_at: new Date().toISOString(),
            },
            ...prev,
          ];
        });
      },
      () => {
        setSettings((prev) => ({ ...prev, blacklisted_ips: prevBlacklisted }));
        setIpLocks(prevLocks);
      },
      `IP ${ip} permanently blacklisted.`
    );
    setCustomBlacklistIp("");
  };

  const handleBlacklistIp = (ipToBlacklist: string) => {
    const ip = ipToBlacklist.trim();
    if (!ip) return;

    if (ip === clientIp) {
      setConfirmDialog({
        title: "Blacklist Your Own Current IP?",
        description: (
          <span>
            WARNING: <strong className="text-rose-600 font-mono">{ip}</strong> is your CURRENT network IP address! Blacklisting this IP will immediately terminate your session and lock you out.
          </span>
        ),
        confirmText: "Yes, Blacklist My IP",
        confirmVariant: "danger",
        icon: "warning",
        onConfirm: () => {
          setConfirmDialog(null);
          executeBlacklistAction(ip);
        },
      });
      return;
    }

    executeBlacklistAction(ip);
  };

  // 4. Unblacklist / Reset IP Strikes
  const handleUnblacklistIp = (ipToUnban: string) => {
    const ip = ipToUnban.trim();
    setPendingActionId(`unban-${ip}`);
    const prevBlacklisted = [...settings.blacklisted_ips];
    const prevLocks = [...ipLocks];

    executeActionOptimistic(
      { action: "unblacklist_ip", ip },
      () => {
        setSettings((prev) => ({
          ...prev,
          blacklisted_ips: prev.blacklisted_ips.filter((x) => x !== ip),
        }));
        setIpLocks((prev) =>
          prev.map((l) => (l.ip === ip ? { ...l, failed_attempts: 0, locked_until: null } : l))
        );
      },
      () => {
        setSettings((prev) => ({ ...prev, blacklisted_ips: prevBlacklisted }));
        setIpLocks(prevLocks);
      },
      `IP ${ip} unbanned and strikes reset.`
    );
  };

  // 5. Add / Remove Allowed IP
  const handleAddAllowedIp = () => {
    const ip = customAllowedIp.trim();
    if (!ip) return;
    const prevAllowed = [...settings.allowed_ips];

    executeActionOptimistic(
      { action: "add_allowed_ip", ip },
      () =>
        setSettings((prev) => ({
          ...prev,
          allowed_ips: Array.from(new Set([...prev.allowed_ips, ip])),
        })),
      () => setSettings((prev) => ({ ...prev, allowed_ips: prevAllowed })),
      `IP ${ip} added to whitelist.`
    );
    setCustomAllowedIp("");
  };

  const handleRemoveAllowedIp = (ip: string) => {
    const prevAllowed = [...settings.allowed_ips];

    executeActionOptimistic(
      { action: "remove_allowed_ip", ip },
      () =>
        setSettings((prev) => ({
          ...prev,
          allowed_ips: prev.allowed_ips.filter((x) => x !== ip),
        })),
      () => setSettings((prev) => ({ ...prev, allowed_ips: prevAllowed })),
      `IP ${ip} removed from whitelist.`
    );
  };

  // 6. Delete Rogue User
  const handleDeleteUser = (userId: string, username: string) => {
    if (username.toLowerCase() === "chief") {
      showNotification("The Chief Administrator account cannot be deleted.", "error");
      return;
    }
    setConfirmDialog({
      title: `Delete user account @${username}?`,
      description: `Are you sure you want to permanently delete user account @${username}? They will immediately lose access to this workspace.`,
      confirmText: "Delete Account",
      confirmVariant: "danger",
      icon: "trash",
      onConfirm: () => {
        setConfirmDialog(null);
        const prevUsers = [...users];
        executeActionOptimistic(
          { action: "delete_user", userId },
          () => setUsers((prev) => prev.filter((u) => u.id !== userId)),
          () => setUsers(prevUsers),
          `User account @${username} deleted.`
        );
      },
    });
  };

  // 7. Kick Out / Terminate All Other Active Sessions Except Current One
  const [isKickingSessions, setIsKickingSessions] = useState(false);

  const executeKickOtherSessions = async () => {
    setIsKickingSessions(true);
    const { sessionId } = getOrCreateSessionId();

    try {
      const res = await fetch("/api/master-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kick_other_sessions",
          keepSessionId: sessionId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("All other active sessions have been evicted and logged out.", "success");
        loadMasterData(true);
      } else {
        showNotification(data.error || "Failed to kick other sessions", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", "error");
    } finally {
      setIsKickingSessions(false);
    }
  };

  const handleKickOtherSessions = () => {
    setConfirmDialog({
      title: "Kick Out All Other Sessions?",
      description: (
        <span>
          Are you sure you want to terminate and log out all active sessions on other devices?{" "}
          <strong className="text-slate-800">Your current device will stay logged in.</strong>
        </span>
      ),
      confirmText: "Kick Out Other Sessions",
      confirmVariant: "danger",
      icon: "logout",
      onConfirm: async () => {
        setConfirmDialog(null);
        await executeKickOtherSessions();
      },
    });
  };

  // 8. Password-Protected Clear Logs System
  const [clearModalTarget, setClearModalTarget] = useState<"all" | "defense" | "visitors" | null>(null);
  const [clearPassword, setClearPassword] = useState("");
  const [clearError, setClearError] = useState<string | null>(null);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [showClearPassword, setShowClearPassword] = useState(false);

  const handleOpenClearModal = (target: "all" | "defense" | "visitors") => {
    setClearModalTarget(target);
    setClearPassword("");
    setClearError(null);
    setShowClearPassword(false);
  };

  const handleConfirmClearLogs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clearPassword.trim() || isClearingLogs || !clearModalTarget) return;

    setIsClearingLogs(true);
    setClearError(null);

    try {
      const res = await fetch("/api/master-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear_logs",
          password: clearPassword.trim(),
          target: clearModalTarget,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setClearError(data.error || "Failed to clear logs");
      } else {
        showNotification(data.message || "Logs cleared successfully.", "success");
        setClearModalTarget(null);
        setClearPassword("");
        loadMasterData(true);
      }
    } catch (err: any) {
      setClearError(err.message || "Network error. Please retry.");
    } finally {
      setIsClearingLogs(false);
    }
  };

  // Render IP with Country Flag Badge (Cross-platform graphics for PC & Mobile)
  const renderIpWithFlag = (ip: string, storedCountry?: string | null) => {
    const code = storedCountry || countryMap[ip] || null;
    const countryName = getCountryName(code, ip);
    const isCurrent = ip === clientIp;

    return (
      <div className="flex items-center gap-2">
        <CountryFlagBadge code={code} ip={ip} className="w-5 h-3.5" />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-bold text-slate-800 tracking-tight truncate">{ip}</span>
          {isCurrent && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              Your IP
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-semibold hidden md:inline truncate max-w-[110px]" title={countryName}>
          {countryName}
        </span>
      </div>
    );
  };

  // Format Relative Time (e.g. "Just now", "2m ago", "1h ago")
  const formatRelativeTime = (dateString?: string | null): string => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((nowTick - date.getTime()) / 1000);
    if (diffInSeconds < 0 || diffInSeconds < 5) return "Just now";
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    return `${Math.floor(diffInDays / 365)}y ago`;
  };

  // Real-time Active Presence Detection:
  // Clients emit heartbeats every 4s. A visitor seen within the last 60 seconds is actively on the website.
  const ACTIVE_THRESHOLD_MS = 60 * 1000;

  const isIpActiveOnSite = useCallback(
    (lastVisitedAt?: string | null) => {
      if (!lastVisitedAt) return false;
      const lastTime = new Date(lastVisitedAt).getTime();
      return nowTick - lastTime < ACTIVE_THRESHOLD_MS;
    },
    [nowTick]
  );

  // Map of IP -> visitor record for fast lookups in attack monitor
  const visitorByIp = useMemo(() => {
    const map = new Map<string, SiteVisitorRecord>();
    for (const v of visitors) {
      map.set(v.ip, v);
    }
    return map;
  }, [visitors]);

  // Visitors who are currently actively connected to the website right now
  const activeVisitors = useMemo(() => {
    return visitors.filter((v) => isIpActiveOnSite(v.last_visited_at));
  }, [visitors, isIpActiveOnSite]);

  // Render Live Active Pill Badge
  const renderActivePill = (
    lastVisitedAt?: string | null,
    isBanned?: boolean,
    isBlockedByLockdown?: boolean,
    isVanished?: boolean
  ) => {
    const active = isIpActiveOnSite(lastVisitedAt);
    if (!active) return null;

    let text = "Active on Site";
    let badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-300";
    let pingClass = "bg-emerald-400";
    let dotClass = "bg-emerald-500";

    if (isVanished) {
      text = "Evicted (Wikipedia)";
      badgeClass = "bg-purple-50 text-purple-800 border-purple-300";
      pingClass = "bg-purple-400";
      dotClass = "bg-purple-500";
    } else if (isBanned) {
      text = "Active (Blacklisted Screen)";
      badgeClass = "bg-rose-50 text-rose-800 border-rose-300";
      pingClass = "bg-rose-400";
      dotClass = "bg-rose-500";
    } else if (isBlockedByLockdown) {
      text = "Active (Lockdown Screen)";
      badgeClass = "bg-amber-50 text-amber-850 border-amber-300";
      pingClass = "bg-amber-400";
      dotClass = "bg-amber-500";
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs shrink-0 select-none ${badgeClass}`}
        title={`Live visitor connection detected within the last 60 seconds (${text})`}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingClass}`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClass}`}
          ></span>
        </span>
        <span>{text}</span>
      </span>
    );
  };

  // Render Combined Timestamp (Relative + Real Clock Time with pulse for recent)
  const renderTimestamp = (dateString?: string | null) => {
    if (!dateString) {
      return <span className="text-slate-400 italic">Never</span>;
    }
    const date = new Date(dateString);
    const relative = formatRelativeTime(dateString);
    const real = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
    const isRecent = nowTick - date.getTime() < 5 * 60 * 1000; // within last 5 minutes

    return (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
          {isRecent && (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          )}
          <span>{relative}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
          {real}
        </span>
      </div>
    );
  };

  // Filtered IP records (Auth attempts) - Sorted by latest relative attempt at the top
  const filteredIpLocks = useMemo(() => {
    return ipLocks
      .filter((rec) => {
        // Pure browsing visitors belong strictly under Live Website Visitor Traffic.
        // IP Traffic & Attack Defense Monitor only shows records with authentication attempts or security enforcement:
        const isBanned = settings.blacklisted_ips?.includes(rec.ip);
        const isLocked = Boolean(rec.locked_until && new Date(rec.locked_until).getTime() > Date.now());
        const hasStrikes = (rec.failed_attempts || 0) > 0;
        const hasHistory = Array.isArray(rec.attempt_history) && rec.attempt_history.length > 0;

        if (!isBanned && !isLocked && !hasStrikes && !hasHistory) {
          return false;
        }

        const q = ipSearch.toLowerCase().trim();
        if (!q) return true;
        const matchesIp = rec.ip.toLowerCase().includes(q);
        const country = getCountryName(rec.country_code || countryMap[rec.ip]).toLowerCase();
        const matchesCountry = country.includes(q);
        const matchesUsers = rec.attempt_history?.some((h) =>
          h.username.toLowerCase().includes(q)
        );
        return matchesIp || matchesCountry || matchesUsers;
      })
      .sort((a, b) => {
        const timeA = a.last_attempt_at ? new Date(a.last_attempt_at).getTime() : 0;
        const timeB = b.last_attempt_at ? new Date(b.last_attempt_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [ipLocks, ipSearch, countryMap, settings.blacklisted_ips]);

  // Filtered Site Visitors (General web browsing traffic) - Sorted by latest relative activity at the top
  const filteredVisitors = useMemo(() => {
    return visitors
      .filter((v) => {
        const q = visitorSearch.toLowerCase().trim();
        if (!q) return true;
        const matchesIp = v.ip.toLowerCase().includes(q);
        const country = getCountryName(v.country_code || countryMap[v.ip]).toLowerCase();
        const matchesCountry = country.includes(q);
        const matchesAgent = v.user_agent?.toLowerCase().includes(q);
        return matchesIp || matchesCountry || matchesAgent;
      })
      .sort((a, b) => {
        const timeA = a.last_visited_at ? new Date(a.last_visited_at).getTime() : 0;
        const timeB = b.last_visited_at ? new Date(b.last_visited_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [visitors, visitorSearch, countryMap]);

  // Parse simple device name from User-Agent
  const formatUserAgent = (ua?: string) => {
    if (!ua) return "Unknown Device";
    if (ua.includes("iPhone")) return "Apple iPhone";
    if (ua.includes("iPad")) return "Apple iPad";
    if (ua.includes("Android")) return "Android Mobile";
    if (ua.includes("Windows")) return "Windows PC";
    if (ua.includes("Macintosh")) return "Apple Mac";
    if (ua.includes("Linux")) return "Linux Device";
    return ua.slice(0, 30);
  };

  // Calculate Metrics
  const blacklistedCount =
    (settings.blacklisted_ips?.length || 0) +
    ipLocks.filter(
      (l) =>
        l.locked_until &&
        new Date(l.locked_until).getTime() > Date.now() &&
        !settings.blacklisted_ips?.includes(l.ip)
    ).length;

  const chiefTargetAttempts = ipLocks.filter((l) =>
    l.attempt_history?.some((h) => h.username.toLowerCase() === "chief")
  ).length;

  // ACCESS DENIED (Non-Chief)
  if (!isChief) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-rose-200/80 p-8 sm:p-10 max-w-md w-full text-center shadow-lg shadow-rose-500/5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Master Control Restricted
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            Master Control and Security Firewall are strictly accessible by the **Chief Administrator**.
          </p>
          <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-400 font-mono">
            Access attempt logged • Unauthorized
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Premium Elevated Toast Notification (Instant feedback) */}
      {actionMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-3 backdrop-blur-md transition-all ${
              actionMessage.type === "success"
                ? "bg-slate-900/95 text-white border-slate-700 shadow-slate-900/30"
                : "bg-rose-600/95 text-white border-rose-500 shadow-rose-900/40"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                actionMessage.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/20 text-white"
              }`}
            >
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="tracking-wide">{actionMessage.text}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Radio className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Master Control & Firewall
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                <span>Chief Access</span>
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Live infrastructure monitor, user registration switch, IP blacklist management, and emergency network lockdown.
          </p>
        </div>

        {/* Actions & Live Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenClearModal("all")}
            className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Clear all rows from both Defense and Visitor monitors (Requires Chief password)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Logs</span>
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live Real-Time Engine Active</span>
          </div>
        </div>
      </div>

      {/* Emergency Lockdown Active Alert (if enabled) */}
      {settings.ip_lockdown_enabled && (
        <div className="bg-rose-500 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight">
                EMERGENCY WEBSITE LOCKDOWN IS ACTIVE
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                The entire website is locked to your authorized IP whitelist. All other networks are automatically denied access.
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleLockdown}
            className="px-4 py-2 bg-white text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-50 transition-all shrink-0 shadow-xs cursor-pointer active:scale-95"
          >
            Lift Website Lockdown
          </button>
        </div>
      )}

      {/* Vanish Mode Active Alert (if enabled) */}
      {settings.vanish_mode_enabled && (
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-purple-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-150 border border-purple-500/30">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Ghost className="w-6 h-6 text-purple-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight">
                  VANISH MODE IS ACTIVE
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white uppercase tracking-wider">
                  Decoy: Wikipedia
                </span>
              </div>
              <p className="text-xs text-purple-100 mt-0.5">
                Non-whitelisted visitors are immediately evicted and redirected to Wikipedia (<span className="font-mono text-purple-200 underline">https://www.wikipedia.org</span>). They cannot stay on any part of this site. Your IP (<span className="font-mono font-bold text-white">{clientIp}</span>) is whitelisted.
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleVanishMode}
            className="px-4 py-2 bg-white text-purple-800 rounded-xl font-bold text-xs hover:bg-purple-50 transition-all shrink-0 shadow-xs cursor-pointer active:scale-95"
          >
            Disable Vanish Mode
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Users & Registration */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Registered Users</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {users.length} <span className="text-xs font-normal text-slate-400">account{users.length === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.registrations_allowed ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              <span className="text-[11px] font-bold text-slate-600">
                {settings.registrations_allowed ? "Registrations Open" : "Registrations Paused"}
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleRegistrations}
            className={`mt-4 w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              settings.registrations_allowed
                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {settings.registrations_allowed ? (
              <>
                <UserX className="w-3.5 h-3.5" />
                <span>Pause Registrations</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Resume Registrations</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: IP Lockdown Switch */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Lockdown Mode</span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  settings.ip_lockdown_enabled
                    ? "bg-rose-50 text-rose-600"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {settings.ip_lockdown_enabled ? "Locked" : "Standard"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {settings.ip_lockdown_enabled
                ? "Restricted to authorized IP list only"
                : "Standard 3-strike IP defense active"}
            </p>
          </div>
          <button
            onClick={handleToggleLockdown}
            className={`mt-4 w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              settings.ip_lockdown_enabled
                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
            }`}
          >
            {settings.ip_lockdown_enabled ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Disable Lockdown</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Lock to Current IP</span>
              </>
            )}
          </button>
        </div>

        {/* Card 3: Vanish Mode Switch */}
        <div className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
          settings.vanish_mode_enabled
            ? "bg-purple-50/60 border-purple-300 ring-2 ring-purple-500/20"
            : "bg-white border-slate-200/90"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Vanish Mode</span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  settings.vanish_mode_enabled
                    ? "bg-purple-100 text-purple-700 animate-pulse"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Ghost className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {settings.vanish_mode_enabled ? "Active" : "Standard"}
              {settings.vanish_mode_enabled && (
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {settings.vanish_mode_enabled
                ? "Non-whitelisted visitors redirected to Wikipedia"
                : "Decoy Wikipedia redirect is currently off"}
            </p>
          </div>
          <button
            onClick={handleToggleVanishMode}
            className={`mt-4 w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              settings.vanish_mode_enabled
                ? "bg-purple-700 text-white hover:bg-purple-800 shadow-xs"
                : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 shadow-xs"
            }`}
          >
            {settings.vanish_mode_enabled ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Disable Vanish</span>
              </>
            ) : (
              <>
                <Ghost className="w-3.5 h-3.5" />
                <span>Enable Vanish Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Card 4: Blacklisted & Locked IPs */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Blocked / Banned IPs</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {blacklistedCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {chiefTargetAttempts > 0
                ? `${chiefTargetAttempts} IP(s) targeted administrator login`
                : "No malicious strikes on administrator"}
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>Server Firewall</span>
            <span className="text-emerald-600 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Active</span>
            </span>
          </div>
        </div>

        {/* Card 4: Your Current IP & Country */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Your Current Network</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="text-base font-mono font-bold text-slate-900 flex items-center gap-2 truncate" title={clientIp}>
              <CountryFlagBadge code={countryMap[clientIp]} ip={clientIp} className="w-5 h-3.5" />
              <span>{clientIp}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {getCountryName(countryMap[clientIp], clientIp)}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(clientIp, "my-ip")}
              className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              {copiedText === "my-ip" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy IP</span>
                </>
              )}
            </button>
            {!settings.allowed_ips?.includes(clientIp) && (
              <button
                onClick={() => handleAddAllowedIp()}
                className="py-1.5 px-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold cursor-pointer active:scale-95"
                title="Add to Whitelist"
              >
                Whitelist
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Registered Accounts Management */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Registered Accounts ({users.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              1-User workspace enforcement. Any extra unauthorized user account can be reviewed and deleted here.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleKickOtherSessions}
              disabled={isKickingSessions}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Immediately log out and evict all active sessions on other devices except this browser"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isKickingSessions ? "Evicting..." : "Kick Out All Other Sessions"}</span>
            </button>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                settings.registrations_allowed
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {settings.registrations_allowed ? "Registrations Open" : "Registrations Locked (1 User Only)"}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map((u) => {
            const isChiefAccount = u.username.toLowerCase() === "chief";
            return (
              <div
                key={u.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isChiefAccount
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        @{u.username}
                      </span>
                      {isChiefAccount ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          Primary Chief Administrator
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Rogue / Additional User
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Role: {u.role || "User"} • ID: <span className="font-mono">{u.id}</span> • Registered {u.created_at ? u.created_at.split("T")[0] : "Initial"}
                    </div>
                  </div>
                </div>

                <div>
                  {isChiefAccount ? (
                    <span className="text-[11px] font-semibold text-slate-400 italic">
                      Protected Account
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.username)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Account</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: IP Whitelist (Allowed IPs for Lockdown Mode) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Authorized Whitelist IPs (Lockdown Allowlist)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Networks permitted when Emergency Website Lockdown is active.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add IP (e.g. 192.168.1.1)"
              value={customAllowedIp}
              onChange={(e) => setCustomAllowedIp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddAllowedIp();
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-mono"
            />
            <button
              onClick={handleAddAllowedIp}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shrink-0 active:scale-95 transition-transform"
            >
              + Add Whitelist IP
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {(!settings.allowed_ips || settings.allowed_ips.length === 0) ? (
            <p className="text-xs text-slate-400 italic">
              No specific IPs whitelisted yet. (Enabling Lockdown will automatically whitelist your current IP: {clientIp}).
            </p>
          ) : (
            settings.allowed_ips.map((ip) => (
              <span
                key={ip}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold"
              >
                <CountryFlagBadge code={countryMap[ip]} ip={ip} className="w-4 h-2.5" />
                <span>{ip}</span>
                {ip === clientIp && (
                  <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded font-sans font-bold">
                    You
                  </span>
                )}
                <button
                  onClick={() => handleRemoveAllowedIp(ip)}
                  className="text-emerald-600 hover:text-rose-600 transition-colors cursor-pointer p-0.5 rounded"
                  title="Remove from whitelist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Section 3: IP Traffic & Attack Defense Monitor */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-600" />
              <span>IP Traffic & Attack Defense Monitor ({filteredIpLocks.length} Recorded IPs)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect all IP addresses attempting authentication, targeting administrator credentials, or blocked by 3-strike lockouts. Country flags displayed for each network.
            </p>
          </div>

          {/* Quick Manual Blacklist Bar & Clear Defense Logs */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Manual Blacklist IP..."
              value={customBlacklistIp}
              onChange={(e) => setCustomBlacklistIp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleBlacklistIp(customBlacklistIp);
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 font-mono"
            />
            <button
              onClick={() => handleBlacklistIp(customBlacklistIp)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shrink-0 shadow-xs active:scale-95 transition-all"
            >
              Blacklist IP
            </button>
            <button
              onClick={() => handleOpenClearModal("defense")}
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer shrink-0 active:scale-95 transition-all flex items-center gap-1.5"
              title="Clear all rows from this IP Attack Defense Monitor (Requires password)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Defense Logs</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search IP, country, or targeted username..."
            value={ipSearch}
            onChange={(e) => setIpSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
          />
        </div>

        {/* IP Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">IP & Country</th>
                <th className="py-2.5 px-3">Status / Enforcement</th>
                <th className="py-2.5 px-3">Strikes</th>
                <th className="py-2.5 px-3">Targeted / Authenticated Account(s)</th>
                <th className="py-2.5 px-3">Last Attempt</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIpLocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching authentication attempts logged yet.
                  </td>
                </tr>
              ) : (
                filteredIpLocks.map((item) => {
                  const isPermanentlyBanned = settings.blacklisted_ips?.includes(item.ip);
                  const isWhitelisted = settings.allowed_ips?.includes(item.ip);
                  const isLocked =
                    isPermanentlyBanned ||
                    (item.locked_until && new Date(item.locked_until).getTime() > Date.now());
                  const isVanished = Boolean(settings.vanish_mode_enabled && !isWhitelisted);

                  return (
                    <tr key={item.ip} className="hover:bg-slate-50/60 transition-colors">
                      {/* IP Address with Flag & Active Pill */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderIpWithFlag(item.ip, item.country_code)}
                          {(() => {
                            const vRecord = visitorByIp.get(item.ip);
                            const latestActiveTime = vRecord?.last_visited_at || item.last_attempt_at;
                            return renderActivePill(
                              latestActiveTime,
                              isPermanentlyBanned,
                              settings.ip_lockdown_enabled && !isWhitelisted,
                              isVanished
                            );
                          })()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {isPermanentlyBanned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 animate-in fade-in duration-100">
                            <Ban className="w-3 h-3" />
                            <span>Blacklisted</span>
                          </span>
                        ) : isVanished ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Ghost className="w-3 h-3 text-purple-600" />
                            <span>Vanished (Wikipedia)</span>
                          </span>
                        ) : isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Lock className="w-3 h-3" />
                            <span>24h Lockout</span>
                          </span>
                        ) : item.failed_attempts > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Suspicious</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Clean Access</span>
                          </span>
                        )}
                      </td>

                      {/* Strikes */}
                      <td className="py-3 px-3 font-semibold text-slate-600">
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.failed_attempts >= 3
                                ? "bg-rose-600"
                                : item.failed_attempts > 0
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span>{item.failed_attempts || 0} / 3</span>
                        </div>
                      </td>

                      {/* Targeted / Authenticated Usernames */}
                      <td className="py-3 px-3">
                        {item.attempt_history && item.attempt_history.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(
                              new Set(item.attempt_history.map((h) => h.username).filter(Boolean))
                            ).map((name) => {
                              const isChiefName = name.toLowerCase() === "chief";
                              const isAttack = item.failed_attempts > 0 || isPermanentlyBanned;

                              return (
                                <span
                                  key={name}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                    isChiefName
                                      ? isAttack
                                        ? "bg-rose-100 text-rose-800 border-rose-300"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                  title={
                                    isChiefName
                                      ? isAttack
                                        ? "Account targeted in unauthorized attempt"
                                        : "Authenticated Chief session"
                                      : `Targeted user: @${name}`
                                  }
                                >
                                  @{name}
                                </span>
                              );
                            })}
                          </div>
                        ) : item.ip === clientIp ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            @chief
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None logged</span>
                        )}
                      </td>

                      {/* Last Attempt */}
                      <td className="py-3 px-3">
                        {renderTimestamp(item.last_attempt_at)}
                      </td>

                      {/* Actions with Instant Click Response */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLocked || isPermanentlyBanned || item.failed_attempts > 0 ? (
                            <button
                              onClick={() => handleUnblacklistIp(item.ip)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer active:scale-95 transition-all"
                              title="Reset strikes & unban"
                            >
                              Unban / Reset
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlacklistIp(item.ip)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] cursor-pointer active:scale-95 transition-all"
                              title="Blacklist this IP"
                            >
                              Blacklist
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Live Website Visitor Traffic (Browsing IPs Even Without Login) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Live Website Visitor Traffic ({visitors.length} Visiting IPs)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks all IP addresses that visit or open your website in real time, even if they don’t attempt to log in. Country flags and 1-click blacklist actions are enabled.
            </p>
          </div>

          {/* Search Visitor IPs & Clear Visitor Logs */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search visitor IP, country..."
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              />
            </div>
            <button
              onClick={() => handleOpenClearModal("visitors")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-xs font-semibold cursor-pointer shrink-0 active:scale-95 transition-all flex items-center gap-1.5"
              title="Clear all recorded website visitor traffic logs (Requires password)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Visitor Logs</span>
            </button>
          </div>
        </div>

        {/* Real-time Currently Active Visitors Presence Bar */}
        <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/90 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Currently Active on Site ({activeVisitors.length}):</span>
          </div>

          {activeVisitors.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              No devices currently active on the site.
            </span>
          ) : (
            activeVisitors.map((v) => {
              const isBanned = settings.blacklisted_ips?.includes(v.ip);
              const isWhitelisted = settings.allowed_ips?.includes(v.ip);
              const isBlocked = settings.ip_lockdown_enabled && !isWhitelisted;
              const isVanished = Boolean(settings.vanish_mode_enabled && !isWhitelisted);
              const isCurrent = v.ip === clientIp;

              return (
                <div
                  key={v.ip}
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs transition-all ${
                    isVanished
                      ? "bg-purple-50 text-purple-900 border-purple-300"
                      : isBanned
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : isBlocked
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  <CountryFlagBadge code={v.country_code || countryMap[v.ip]} ip={v.ip} className="w-4 h-2.5" />
                  <span className="font-mono font-bold">{v.ip}</span>
                  {isCurrent && (
                    <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded font-sans font-bold">
                      You
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.2 rounded ${
                      isVanished
                        ? "bg-purple-200/70 text-purple-900"
                        : isBanned
                        ? "bg-rose-200/70 text-rose-900"
                        : isBlocked
                        ? "bg-amber-200/70 text-amber-900"
                        : "bg-emerald-200/70 text-emerald-900"
                    }`}
                  >
                    {isVanished
                      ? "Vanished -> Wikipedia"
                      : isBanned
                      ? "Blacklist Screen"
                      : isBlocked
                      ? "Lockdown Screen"
                      : "Active on Site"}
                  </span>
                </div>
              );
            })
          )}

          {/* Quick Evict Button in presence bar */}
          <button
            onClick={handleKickOtherSessions}
            disabled={isKickingSessions}
            className="ml-auto px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
            title="Terminate all active sessions on other devices except this browser"
          >
            <LogOut className="w-3 h-3" />
            <span>{isKickingSessions ? "Evicting..." : "Kick Other Sessions"}</span>
          </button>
        </div>

        {/* Visitors Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Visitor IP & Country</th>
                <th className="py-2.5 px-3">Page Visits</th>
                <th className="py-2.5 px-3">Device & Browser</th>
                <th className="py-2.5 px-3">First Seen</th>
                <th className="py-2.5 px-3">Last Active</th>
                <th className="py-2.5 px-3">Access Status</th>
                <th className="py-2.5 px-3 text-right">Firewall Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No visitor traffic recorded yet. Visits will appear here automatically in real time.
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((visitor) => {
                  const isBanned = settings.blacklisted_ips?.includes(visitor.ip);
                  const isWhitelisted = settings.allowed_ips?.includes(visitor.ip);
                  const isBlockedByLockdown = settings.ip_lockdown_enabled && !isWhitelisted;
                  const isVanished = Boolean(settings.vanish_mode_enabled && !isWhitelisted);

                  return (
                    <tr key={visitor.ip} className="hover:bg-slate-50/60 transition-colors">
                      {/* Visitor IP with Country Flag & Active Pill */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderIpWithFlag(visitor.ip, visitor.country_code)}
                          {renderActivePill(
                            visitor.last_visited_at,
                            isBanned,
                            isBlockedByLockdown,
                            isVanished
                          )}
                        </div>
                      </td>

                      {/* Visit Count */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 text-[11px]">
                          <Activity className="w-3 h-3 text-indigo-500" />
                          <span>{visitor.visit_count} visit{visitor.visit_count === 1 ? "" : "s"}</span>
                        </span>
                      </td>

                      {/* Device / Browser */}
                      <td className="py-3 px-3 text-slate-600 font-medium max-w-[200px] truncate" title={visitor.user_agent}>
                        {formatUserAgent(visitor.user_agent)}
                      </td>

                      {/* First Seen */}
                      <td className="py-3 px-3">
                        {renderTimestamp(visitor.first_visited_at)}
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-3">
                        {renderTimestamp(visitor.last_visited_at)}
                      </td>

                      {/* Access Status */}
                      <td className="py-3 px-3">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 animate-in fade-in duration-100">
                            <Ban className="w-3 h-3" />
                            <span>Blacklisted</span>
                          </span>
                        ) : isVanished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Ghost className="w-3 h-3 text-purple-600" />
                            <span>Vanished (Wikipedia)</span>
                          </span>
                        ) : isBlockedByLockdown ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Lock className="w-3 h-3" />
                            <span>Blocked (Lockdown)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Allowed</span>
                          </span>
                        )}
                      </td>

                      {/* Actions with Instant Click Response */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isBanned ? (
                            <button
                              onClick={() => handleUnblacklistIp(visitor.ip)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer active:scale-95 transition-all"
                              title="Unban visitor IP"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlacklistIp(visitor.ip)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition-all cursor-pointer active:scale-95 shadow-2xs"
                              title="Blacklist this visitor IP"
                            >
                              Blacklist IP
                            </button>
                          )}
                          {!isWhitelisted && (
                            <button
                              onClick={() => {
                                setPendingActionId(`whitelist-${visitor.ip}`);
                                const prevAllowed = [...settings.allowed_ips];
                                executeActionOptimistic(
                                  { action: "add_allowed_ip", ip: visitor.ip },
                                  () =>
                                    setSettings((prev) => ({
                                      ...prev,
                                      allowed_ips: Array.from(new Set([...prev.allowed_ips, visitor.ip])),
                                    })),
                                  () => setSettings((prev) => ({ ...prev, allowed_ips: prevAllowed })),
                                  `IP (${visitor.ip}) added to Whitelist.`
                                );
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] cursor-pointer active:scale-95 transition-all"
                              title="Add to Whitelist"
                            >
                              Whitelist
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password-Protected Clear Logs Modal */}
      {clearModalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setClearModalTarget(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {clearModalTarget === "all"
                    ? "Clear All Security & Visitor Logs"
                    : clearModalTarget === "defense"
                    ? "Clear Attack Defense Logs"
                    : "Clear Website Visitor Logs"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requires Chief Administrator authorization
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              This action will permanently wipe all rows from{" "}
              <strong className="text-slate-900 font-semibold">
                {clearModalTarget === "all"
                  ? "both the Attack Defense Monitor and the Live Visitor Traffic tables"
                  : clearModalTarget === "defense"
                  ? "the IP Traffic & Attack Defense Monitor"
                  : "the Live Website Visitor Traffic table"}
              </strong>
              . Enter your administrator password to confirm.
            </p>

            <form onSubmit={handleConfirmClearLogs} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Administrator Password
                </label>
                <div className="relative">
                  <input
                    type={showClearPassword ? "text" : "password"}
                    autoFocus
                    placeholder="Enter Chief password..."
                    value={clearPassword}
                    onChange={(e) => {
                      setClearPassword(e.target.value);
                      if (clearError) setClearError(null);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClearPassword(!showClearPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showClearPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {clearError && (
                  <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{clearError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setClearModalTarget(null)}
                  disabled={isClearingLogs}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClearingLogs || !clearPassword.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isClearingLogs ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying & Wiping...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm & Clear</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project-Style Custom Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmDialog(null)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm sm:max-w-md w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-xs ${
                confirmDialog.confirmVariant === "purple"
                  ? "bg-purple-50 border border-purple-200/80 text-purple-600"
                  : confirmDialog.confirmVariant === "danger"
                  ? "bg-rose-50 border border-rose-200/80 text-rose-600"
                  : confirmDialog.confirmVariant === "warning"
                  ? "bg-amber-50 border border-amber-200/80 text-amber-600"
                  : "bg-blue-50 border border-blue-200/80 text-blue-600"
              }`}
            >
              {confirmDialog.icon === "ghost" ? (
                <Ghost className="w-6 h-6 animate-pulse" />
              ) : confirmDialog.icon === "logout" ? (
                <LogOut className="w-6 h-6" />
              ) : confirmDialog.icon === "trash" ? (
                <Trash2 className="w-6 h-6" />
              ) : confirmDialog.icon === "lock" ? (
                <Lock className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {confirmDialog.title}
            </h3>

            <div className="text-xs text-slate-500 mt-2 leading-relaxed">
              {confirmDialog.description}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95 ${
                  confirmDialog.confirmVariant === "purple"
                    ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
                    : confirmDialog.confirmVariant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                    : confirmDialog.confirmVariant === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
