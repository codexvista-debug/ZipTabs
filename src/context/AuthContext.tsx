"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/crypto";

export interface AppUser {
  id: string;
  username: string;
  role: string;
}

export interface LockoutInfo {
  ip: string;
  locked: boolean;
  attempts: number;
  remainingAttempts: number;
  lockedUntil: string | null;
  remainingMs: number;
  isLockdown?: boolean;
  isBlacklisted?: boolean;
  isVanishMode?: boolean;
  vanishRedirectUrl?: string;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lockoutInfo: LockoutInfo | null;
  refreshLockoutStatus: () => Promise<LockoutInfo | null>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; locked?: boolean; attempts?: number }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: (isInactivityTimeout?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = "ziptabs_logged_user";
const SESSION_ID_KEY = "ziptabs_session_id";
const SESSION_CREATED_KEY = "ziptabs_session_created";
export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
export const LAST_ACTIVITY_KEY = "ziptabs_last_activity";
export const INACTIVITY_LOGOUT_FLAG = "ziptabs_inactivity_logged_out";

export function getOrCreateSessionId(): { sessionId: string; sessionCreated: number } {
  if (typeof window === "undefined") {
    return { sessionId: "server_session", sessionCreated: Date.now() };
  }
  let sessId = localStorage.getItem(SESSION_ID_KEY);
  let sessCreatedStr = localStorage.getItem(SESSION_CREATED_KEY);
  let sessCreated = sessCreatedStr ? parseInt(sessCreatedStr, 10) : 0;

  if (!sessId || !sessCreated) {
    sessId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    sessCreated = Date.now();
    localStorage.setItem(SESSION_ID_KEY, sessId);
    localStorage.setItem(SESSION_CREATED_KEY, sessCreated.toString());
  }
  return { sessionId: sessId, sessionCreated: sessCreated };
}

export function generateNewSessionId(): { sessionId: string; sessionCreated: number } {
  if (typeof window === "undefined") {
    return { sessionId: "server_session", sessionCreated: Date.now() };
  }
  const sessId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const sessCreated = Date.now();
  localStorage.setItem(SESSION_ID_KEY, sessId);
  localStorage.setItem(SESSION_CREATED_KEY, sessCreated.toString());
  return { sessionId: sessId, sessionCreated: sessCreated };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockoutInfo, setLockoutInfo] = useState<LockoutInfo | null>(null);

  const refreshLockoutStatus = async (overrideUser?: string): Promise<LockoutInfo | null> => {
    try {
      let currentUsername = overrideUser || user?.username;
      if (!currentUsername && typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.username) currentUsername = parsed.username;
          }
        } catch {}
      }

      const { sessionId, sessionCreated } = getOrCreateSessionId();
      const headers: Record<string, string> = {
        "x-session-id": sessionId,
        "x-session-created": sessionCreated.toString(),
      };
      if (currentUsername) {
        headers["x-auth-user"] = currentUsername;
      }

      const res = await fetch("/api/auth/lockout-status", { headers });
      if (res.ok) {
        const data: LockoutInfo = await res.json();
        setLockoutInfo(data);
        if (data.isVanishMode && typeof window !== "undefined") {
          window.location.replace(data.vanishRedirectUrl || "https://www.wikipedia.org");
        }
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch lockout status:", err);
    }
    return null;
  };

  // Restore session from localStorage and perform security check before unlocking UI
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          // Check if session has expired due to 60+ minutes of inactivity
          const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
          if (lastActivityStr) {
            const lastActivity = parseInt(lastActivityStr, 10);
            if (!isNaN(lastActivity) && Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) {
              // Expired during inactivity while tab/device was closed
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(LAST_ACTIVITY_KEY);
              if (typeof window !== "undefined") {
                try {
                  sessionStorage.setItem(INACTIVITY_LOGOUT_FLAG, "true");
                } catch {}
              }
              setUser(null);
              setIsLoading(false);
              return;
            }
          }

          setUser(JSON.parse(stored));
          // Refresh activity timestamp on confirmed active restore
          try {
            localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
          } catch {}
        }
      } catch {}

      // Initial security verification before revealing ANY UI
      const info = await refreshLockoutStatus();
      if (info?.isVanishMode && typeof window !== "undefined") {
        setUser(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LAST_ACTIVITY_KEY);
        } catch {}
        window.location.replace(info.vanishRedirectUrl || "https://www.wikipedia.org");
        return; // Never reveal UI, keep loading state while navigating away
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cross-tab synchronization (Instant logout / login across all tabs)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel("ziptabs_auth_sync");
      bc.onmessage = (event) => {
        if (event.data?.type === "LOGOUT") {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          if (event.data?.isInactivityTimeout) {
            try {
              sessionStorage.setItem(INACTIVITY_LOGOUT_FLAG, "true");
            } catch {}
          }
        } else if (event.data?.type === "LOGIN" && event.data?.user) {
          setUser(event.data.user);
          try {
            sessionStorage.removeItem(INACTIVITY_LOGOUT_FLAG);
          } catch {}
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (!e.newValue) {
          setUser(null);
        } else {
          try {
            setUser(JSON.parse(e.newValue));
          } catch {}
        }
      } else if (e.key === "ziptabs_logout_trigger") {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Active Session & Lockdown Heartbeat:
  // Terminates active sessions immediately if IP is locked, blacklisted, or rejected by lockdown
  useEffect(() => {
    if (typeof window === "undefined") return;

    const verifyLockdownAndSession = async () => {
      const info = await refreshLockoutStatus();
      if (info?.isVanishMode && typeof window !== "undefined") {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        window.location.replace(info.vanishRedirectUrl || "https://www.wikipedia.org");
        return;
      }
      if (info?.locked) {
        // Immediate termination: IP is not permitted
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        if ("BroadcastChannel" in window) {
          try {
            const bc = new BroadcastChannel("ziptabs_auth_sync");
            bc.postMessage({ type: "LOGOUT" });
            bc.close();
          } catch {}
        }
      }
    };

    // Run verification immediately
    verifyLockdownAndSession();

    // Check when user switches to or focuses the window
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        verifyLockdownAndSession();
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", verifyLockdownAndSession);

    // Continuous 4-second heartbeat
    const pollInterval = setInterval(verifyLockdownAndSession, 4000);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", verifyLockdownAndSession);
      clearInterval(pollInterval);
    };
  }, []);

  // 60-Minute Inactivity Auto-Logout Security Watchdog
  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    // Record activity timestamp (throttled to at most once every 5 seconds)
    let lastThrottledRecord = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottledRecord > 5000) {
        lastThrottledRecord = now;
        try {
          localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        } catch {}
      }
    };

    // Events that signify user activity: typing, clicking, dragging, scrolling, touching
    const activityEvents: (keyof WindowEventMap)[] = [
      "pointerdown",
      "mousemove",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check if session has exceeded 60 minutes of inactivity
    const checkSessionInactivity = () => {
      try {
        const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivityStr) {
          localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
          return;
        }
        const lastActivity = parseInt(lastActivityStr, 10);
        if (isNaN(lastActivity)) {
          localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
          return;
        }

        const idleTime = Date.now() - lastActivity;
        if (idleTime >= INACTIVITY_TIMEOUT_MS) {
          // Terminate active session immediately
          logout(true);
        }
      } catch (err) {
        console.error("Error evaluating inactivity status:", err);
      }
    };

    // Check on focus or tab visibility change (e.g. user returns to inactive tab or wakes device)
    const handleFocusOrVisible = () => {
      checkSessionInactivity();
    };

    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    // Continuous 15-second background interval check
    const inactivityInterval = setInterval(checkSessionInactivity, 15000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      clearInterval(inactivityInterval);
    };
  }, [user]);

  const login = async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      return { success: false, error: "Username and password are required." };
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });

      const data = await res.json();

      if (data.isVanishMode && typeof window !== "undefined") {
        window.location.replace(data.vanishRedirectUrl || "https://www.wikipedia.org");
        return { success: false, error: "Access Denied.", locked: true };
      }

      if (data.locked) {
        setLockoutInfo({
          ip: data.ip,
          locked: true,
          attempts: data.attempts || 3,
          remainingAttempts: 0,
          lockedUntil: data.lockedUntil,
          remainingMs: data.remainingMs || 24 * 60 * 60 * 1000,
        });
        return { success: false, locked: true, attempts: 3, error: data.error };
      }

      if (!res.ok || !data.success) {
        if (data.attempts !== undefined) {
          setLockoutInfo({
            ip: data.ip,
            locked: false,
            attempts: data.attempts,
            remainingAttempts: data.remainingAttempts ?? Math.max(0, 3 - data.attempts),
            lockedUntil: null,
            remainingMs: 0,
          });
        }
        return { success: false, error: data.error, attempts: data.attempts };
      }

      // Login Successful!
      generateNewSessionId();
      const loggedUser: AppUser = data.user;
      setUser(loggedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      try {
        sessionStorage.removeItem(INACTIVITY_LOGOUT_FLAG);
      } catch {}
      setLockoutInfo(null);

      // Notify other tabs on same device
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("ziptabs_auth_sync");
          bc.postMessage({ type: "LOGIN", user: loggedUser });
          bc.close();
        } catch {}
      }

      return { success: true };
    } catch (err: any) {
      console.error("Login request error:", err);
      return { success: false, error: "Server connection failed. Please retry." };
    }
  };

  const register = async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      return { success: false, error: "Username is required." };
    }
    if (cleanPassword.length < 3) {
      return { success: false, error: "Password must be at least 3 characters." };
    }

    if (supabase) {
      try {
        // Enforce Master Control registration lock policy
        const { data: settings } = await supabase
          .from("system_security_settings")
          .select("registrations_allowed")
          .eq("id", "global")
          .maybeSingle();

        if (settings && !settings.registrations_allowed) {
          return {
            success: false,
            error: "New user registrations are currently paused and locked by the Chief Administrator.",
          };
        }

        const { data: existing } = await supabase
          .from("app_users")
          .select("id")
          .ilike("username", cleanUsername)
          .maybeSingle();

        if (existing) {
          return { success: false, error: `Username '${cleanUsername}' is already taken.` };
        }

        // HASH PASSWORD BEFORE STORING IN DATABASE
        const securePasswordHash = await hashPassword(cleanPassword);

        const { data: newUser, error: insertError } = await supabase
          .from("app_users")
          .insert([
            {
              username: cleanUsername,
              password: securePasswordHash,
              role: "Administrator",
            },
          ])
          .select()
          .single();

        if (insertError) {
          return { success: false, error: insertError.message };
        }

        const loggedUser: AppUser = {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role || "Administrator",
        };
        setUser(loggedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        try {
          sessionStorage.removeItem(INACTIVITY_LOGOUT_FLAG);
        } catch {}
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to register user." };
      }
    }

    return { success: false, error: "Database not connected." };
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!user) return { success: false, error: "Not authenticated." };

    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();

    if (cleanNew.length < 3) {
      return { success: false, error: "New password must be at least 3 characters." };
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("app_users")
          .select("*")
          .ilike("username", user.username.toLowerCase())
          .maybeSingle();

        if (data) {
          const isValidOld = await verifyPassword(cleanOld, data.password);
          if (!isValidOld) {
            return { success: false, error: "Current password does not match." };
          }
        }

        // HASH NEW PASSWORD BEFORE SAVING IN SUPABASE
        const secureNewHash = await hashPassword(cleanNew);

        const { error: updateError } = await supabase
          .from("app_users")
          .update({ password: secureNewHash })
          .ilike("username", user.username.toLowerCase());

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to update password." };
      }
    }

    return { success: true };
  };

  const logout = (isInactivityTimeout: boolean | unknown = false) => {
    const isTimeout = isInactivityTimeout === true;
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    try {
      if (typeof window !== "undefined") {
        if (isTimeout) {
          try {
            sessionStorage.setItem(INACTIVITY_LOGOUT_FLAG, "true");
          } catch {}
        } else {
          try {
            sessionStorage.removeItem(INACTIVITY_LOGOUT_FLAG);
          } catch {}
        }
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("ziptabs_auth_sync");
          bc.postMessage({ type: "LOGOUT", isInactivityTimeout: isTimeout });
          bc.close();
        }
        localStorage.setItem("ziptabs_logout_trigger", Date.now().toString());
        localStorage.removeItem("ziptabs_logout_trigger");
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        lockoutInfo,
        refreshLockoutStatus,
        login,
        register,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
