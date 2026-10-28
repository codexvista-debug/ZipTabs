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
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = "ziptabs_logged_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockoutInfo, setLockoutInfo] = useState<LockoutInfo | null>(null);

  const refreshLockoutStatus = async (): Promise<LockoutInfo | null> => {
    try {
      const res = await fetch("/api/auth/lockout-status");
      if (res.ok) {
        const data: LockoutInfo = await res.json();
        setLockoutInfo(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch lockout status:", err);
    }
    return null;
  };

  // Restore session from localStorage on mount and check IP lockout
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }

    refreshLockoutStatus();
  }, []);

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
      const loggedUser: AppUser = data.user;
      setUser(loggedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      setLockoutInfo(null);
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
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
