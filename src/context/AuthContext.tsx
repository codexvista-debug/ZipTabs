"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { preloadAllWorkspaceData, clearWorkspaceCache } from "@/lib/workspacePreloader";

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
  loadingProgress?: number;
  loadingStatus?: string;
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
export const INACTIVITY_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours (180 minutes)
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(undefined);
  const [loadingStatus, setLoadingStatus] = useState<string | undefined>(undefined);
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

      const res = await fetch(`/api/auth/lockout-status?_t=${Date.now()}`, {
        headers: {
          ...headers,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
        signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(2500) : undefined,
      });
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

  // Validate session strictly against server HttpOnly session cookie & preload workspace data
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      // 1. Check client inactivity timeout first
      if (typeof window !== "undefined") {
        try {
          const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
          if (lastActivityStr) {
            const lastActivity = parseInt(lastActivityStr, 10);
            if (!isNaN(lastActivity) && Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) {
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(LAST_ACTIVITY_KEY);
              clearWorkspaceCache();
              try {
                sessionStorage.setItem(INACTIVITY_LOGOUT_FLAG, "true");
              } catch {}
              if (isMounted) {
                setUser(null);
                setIsLoading(false);
              }
              fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
              return;
            }
          }
        } catch {}
      }

      if (isMounted) {
        setLoadingProgress(15);
        setLoadingStatus("Securing perimeter connection...");
      }

      // 2. Run lockout status check & cryptographic HttpOnly session verification concurrently
      try {
        const [info, meRes] = await Promise.all([
          refreshLockoutStatus(),
          fetch("/api/auth/me", { cache: "no-store" }).catch(() => null),
        ]);

        if (info?.isVanishMode && typeof window !== "undefined") {
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LAST_ACTIVITY_KEY);
          } catch {}
          clearWorkspaceCache();
          window.location.replace(info.vanishRedirectUrl || "https://www.wikipedia.org");
          return;
        }

        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated && meData.user) {
            if (isMounted) {
              setUser(meData.user);
            }
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(meData.user));
              localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
            } catch {}

            // 3. Preload and decrypt all workspace data during the loading screen
            if (!info?.locked) {
              await preloadAllWorkspaceData(meData.user, (pct, status) => {
                if (isMounted) {
                  setLoadingProgress(pct);
                  setLoadingStatus(status);
                }
              });
            }
          } else {
            if (isMounted) {
              setUser(null);
            }
            clearWorkspaceCache();
            try {
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(LAST_ACTIVITY_KEY);
            } catch {}
          }
        } else {
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Session verification error:", err);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
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

  // 3-Hour Inactivity Auto-Logout Security Watchdog
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

    // Check if session has exceeded 3 hours of inactivity
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
      setIsLoading(true);
      setLoadingProgress(20);
      setLoadingStatus("Querying Supabase Cloud Vault...");
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

      // Preload and decrypt workspace data while showing loading screen
      try {
        await preloadAllWorkspaceData(loggedUser, (pct, status) => {
          setLoadingProgress(pct);
          setLoadingStatus(status);
        });
      } finally {
        setIsLoading(false);
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
    if (cleanPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters." };
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to register user." };
      }

      const loggedUser: AppUser = data.user;
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
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!user) return { success: false, error: "Not authenticated." };

    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();

    if (cleanNew.length < 8) {
      return { success: false, error: "New password must be at least 8 characters." };
    }
    if (cleanNew === cleanOld) {
      return { success: false, error: "New password must be different from current password." };
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          oldPassword: cleanOld,
          newPassword: cleanNew,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to update password." };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to update password." };
    }
  };

  const logout = (isInactivityTimeout: boolean | unknown = false) => {
    const isTimeout = isInactivityTimeout === true;
    clearWorkspaceCache();
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    try {
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } catch {}
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
        loadingProgress,
        loadingStatus,
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
