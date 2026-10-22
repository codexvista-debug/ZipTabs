"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/crypto";

export interface AppUser {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = "ziptabs_logged_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
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
  }, []);

  const login = async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      return { success: false, error: "Username and password are required." };
    }

    // 1. Try Supabase app_users table with cryptographic hash verification
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("app_users")
          .select("*")
          .ilike("username", cleanUsername)
          .maybeSingle();

        if (data) {
          const isValid = await verifyPassword(cleanPassword, data.password);
          if (isValid) {
            // If stored as plaintext legacy, auto-upgrade to SHA-256 hash in DB
            if (data.password === cleanPassword) {
              const newHash = await hashPassword(cleanPassword);
              await supabase
                .from("app_users")
                .update({ password: newHash })
                .eq("id", data.id);
            }

            const loggedUser: AppUser = {
              id: data.id,
              username: data.username,
              role: data.role || "Administrator",
            };
            setUser(loggedUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
            return { success: true };
          } else {
            return { success: false, error: "Incorrect password." };
          }
        }
      } catch (err) {
        console.warn("Supabase check error:", err);
      }
    }

    return {
      success: false,
      error: "User not found or credentials incorrect.",
    };
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
