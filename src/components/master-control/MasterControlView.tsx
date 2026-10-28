"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
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
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Plus,
  Search,
  Eye,
  KeyRound,
  Shield,
  Clock,
  Laptop,
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
  failed_attempts: number;
  locked_until: string | null;
  last_attempt_at: string | null;
  attempt_history?: IpAttemptHistoryItem[];
}

interface SystemSecuritySettings {
  id: string;
  registrations_allowed: boolean;
  ip_lockdown_enabled: boolean;
  allowed_ips: string[];
  blacklisted_ips: string[];
  updated_at?: string;
  updated_by?: string;
}

export function MasterControlView() {
  const { user } = useAuth();
  const isChief = user?.username?.toLowerCase() === "chief";

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Search & Filter
  const [ipSearch, setIpSearch] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Manual actions
  const [customBlacklistIp, setCustomBlacklistIp] = useState("");
  const [customAllowedIp, setCustomAllowedIp] = useState("");
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
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
    if (!isSilent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/master-control");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setClientIp(data.clientIp || "127.0.0.1");
          setSettings(data.settings);
          setUsers(data.users || []);
          setIpLocks(data.ipLocks || []);
        }
      }
    } catch (err) {
      console.error("Master Control load failed:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isChief) {
      loadMasterData();
    } else {
      setIsLoading(false);
    }
  }, [isChief, loadMasterData]);

  // Execute Master Actions
  const executeAction = async (payload: any, successMsg: string) => {
    try {
      const res = await fetch("/api/master-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(successMsg, "success");
        await loadMasterData(true);
      } else {
        showNotification(data.error || "Action failed", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Request failed", "error");
    }
  };

  // 1. Toggle Registrations
  const handleToggleRegistrations = () => {
    const nextState = !settings.registrations_allowed;
    executeAction(
      { action: "toggle_registrations", allowed: nextState },
      nextState
        ? "User registrations are now OPEN."
        : "User registrations are PAUSED (Locked to 1 user)."
    );
  };

  // 2. Toggle Website Lockdown to Current IP
  const handleToggleLockdown = () => {
    const nextState = !settings.ip_lockdown_enabled;
    executeAction(
      { action: "toggle_lockdown", enabled: nextState },
      nextState
        ? `WEBSITE LOCKED DOWN: Access restricted strictly to IP ${clientIp}.`
        : "Website lockdown lifted. Standard IP monitoring active."
    );
  };

  // 3. Blacklist an IP
  const handleBlacklistIp = (ipToBlacklist: string) => {
    if (!ipToBlacklist.trim()) return;
    if (ipToBlacklist === clientIp) {
      if (
        !confirm(
          `WARNING: ${ipToBlacklist} is your CURRENT IP address! Are you sure you want to blacklist yourself?`
        )
      ) {
        return;
      }
    }
    executeAction(
      { action: "blacklist_ip", ip: ipToBlacklist.trim() },
      `IP ${ipToBlacklist} permanently blacklisted.`
    );
    setCustomBlacklistIp("");
  };

  // 4. Unblacklist / Reset IP Strikes
  const handleUnblacklistIp = (ipToUnban: string) => {
    executeAction(
      { action: "unblacklist_ip", ip: ipToUnban.trim() },
      `IP ${ipToUnban} unbanned and strikes reset.`
    );
  };

  // 5. Add / Remove Allowed IP
  const handleAddAllowedIp = () => {
    if (!customAllowedIp.trim()) return;
    executeAction(
      { action: "add_allowed_ip", ip: customAllowedIp.trim() },
      `IP ${customAllowedIp} added to whitelist.`
    );
    setCustomAllowedIp("");
  };

  const handleRemoveAllowedIp = (ip: string) => {
    executeAction(
      { action: "remove_allowed_ip", ip },
      `IP ${ip} removed from whitelist.`
    );
  };

  // 6. Delete Rogue User
  const handleDeleteUser = (userId: string, username: string) => {
    if (username.toLowerCase() === "chief") {
      alert("The Chief Administrator account cannot be deleted.");
      return;
    }
    if (confirm(`Are you sure you want to permanently delete user account @${username}?`)) {
      executeAction(
        { action: "delete_user", userId },
        `User account @${username} deleted.`
      );
    }
  };

  // Filtered IP records
  const filteredIpLocks = ipLocks.filter((rec) => {
    const q = ipSearch.toLowerCase().trim();
    if (!q) return true;
    const matchesIp = rec.ip.toLowerCase().includes(q);
    const matchesUsers = rec.attempt_history?.some((h) =>
      h.username.toLowerCase().includes(q)
    );
    return matchesIp || matchesUsers;
  });

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
            Master Control and Security Firewall are strictly accessible by the **Chief Administrator (@chief)**.
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
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2.5 transition-all animate-bounce-short ${
            actionMessage.type === "success"
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-white" />
          )}
          <span>{actionMessage.text}</span>
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

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadMasterData()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Emergency Lockdown Active Alert (if enabled) */}
      {settings.ip_lockdown_enabled && (
        <div className="bg-rose-500 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse-slow">
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
            className="px-4 py-2 bg-white text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-50 transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            Lift Website Lockdown
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            className={`mt-4 w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
            className={`mt-4 w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              settings.ip_lockdown_enabled
                ? "bg-rose-600 text-white hover:bg-rose-700"
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

        {/* Card 3: Blacklisted & Locked IPs */}
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
                ? `${chiefTargetAttempts} IP(s) targeted @chief account`
                : "No malicious strikes on @chief"}
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

        {/* Card 4: Your Current IP */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Your Current Network</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="text-base font-mono font-bold text-slate-900 truncate" title={clientIp}>
              {clientIp}
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Chief Verified
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(clientIp, "my-ip")}
              className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
                onClick={() =>
                  executeAction(
                    { action: "add_allowed_ip", ip: clientIp },
                    `Current IP (${clientIp}) added to Whitelist.`
                  )
                }
                className="py-1.5 px-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold cursor-pointer"
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
              You intend to maintain only 1 user (<strong>@chief</strong>). Extra accounts can be reviewed and deleted here.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-mono"
            />
            <button
              onClick={handleAddAllowedIp}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shrink-0"
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
                <span>{ip}</span>
                {ip === clientIp && (
                  <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded font-sans font-bold">
                    You
                  </span>
                )}
                <button
                  onClick={() => handleRemoveAllowedIp(ip)}
                  className="text-emerald-600 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Remove from whitelist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Section 3: IP Access & Security Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-600" />
              <span>IP Traffic & Attack Defense Monitor ({ipLocks.length} Recorded IPs)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect all IP addresses attempting authentication, targeting @chief, or blocked by 3-strike lockouts.
            </p>
          </div>

          {/* Quick Manual Blacklist Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Manual Blacklist IP..."
              value={customBlacklistIp}
              onChange={(e) => setCustomBlacklistIp(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 font-mono"
            />
            <button
              onClick={() => handleBlacklistIp(customBlacklistIp)}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shrink-0 shadow-xs"
            >
              Blacklist IP
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search IP or targeted username..."
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
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Status / Enforcement</th>
                <th className="py-2.5 px-3">Strikes</th>
                <th className="py-2.5 px-3">Targeted Account(s)</th>
                <th className="py-2.5 px-3">Last Attempt</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIpLocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching IP logs found.
                  </td>
                </tr>
              ) : (
                filteredIpLocks.map((item) => {
                  const isCurrent = item.ip === clientIp;
                  const isPermanentlyBanned = settings.blacklisted_ips?.includes(item.ip);
                  const isLocked =
                    isPermanentlyBanned ||
                    (item.locked_until && new Date(item.locked_until).getTime() > Date.now());
                  const targetedChief = item.attempt_history?.some(
                    (h) => h.username.toLowerCase() === "chief"
                  );

                  return (
                    <tr key={item.ip} className="hover:bg-slate-50/60 transition-colors">
                      {/* IP Address */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{item.ip}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Your IP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {isPermanentlyBanned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            <Ban className="w-3 h-3" />
                            <span>Blacklisted</span>
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

                      {/* Targeted Usernames */}
                      <td className="py-3 px-3">
                        {item.attempt_history && item.attempt_history.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(
                              new Set(item.attempt_history.map((h) => h.username))
                            ).map((name) => (
                              <span
                                key={name}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  name.toLowerCase() === "chief"
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                @{name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None logged</span>
                        )}
                      </td>

                      {/* Last Attempt */}
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {item.last_attempt_at
                          ? new Date(item.last_attempt_at).toLocaleString()
                          : "Never"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLocked || isPermanentlyBanned || item.failed_attempts > 0 ? (
                            <button
                              onClick={() => handleUnblacklistIp(item.ip)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                              title="Reset strikes & unban"
                            >
                              Unban / Reset
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlacklistIp(item.ip)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] cursor-pointer"
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
    </div>
  );
}
