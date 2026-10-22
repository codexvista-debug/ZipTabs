"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

    // 1. Try Supabase app_users table
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("app_users")
          .select("*")
          .ilike("username", cleanUsername)
          .maybeSingle();

        if (data) {
          if (data.password === cleanPassword) {
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
        console.warn("Supabase check error, checking fallback:", err);
      }
    }

    // 2. Built-in Chief fallback (if database query is pending or offline)
    if (cleanUsername === "chief" && cleanPassword === "123") {
      const chiefUser: AppUser = {
        id: "chief-admin-id",
        username: "chief",
        role: "Chief Administrator",
      };
      setUser(chiefUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chiefUser));
      return { success: true };
    }

    return {
      success: false,
      error: "User not found. Use 'chief' with password '123' or register a new user.",
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
        // Check if username already exists
        const { data: existing } = await supabase
          .from("app_users")
          .select("id")
          .ilike("username", cleanUsername)
          .maybeSingle();

        if (existing) {
          return { success: false, error: `Username '${cleanUsername}' is already taken.` };
        }

        // Insert new user
        const { data: newUser, error: insertError } = await supabase
          .from("app_users")
          .insert([
            {
              username: cleanUsername,
              password: cleanPassword,
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
        // Verify old password
        const { data, error } = await supabase
          .from("app_users")
          .select("*")
          .ilike("username", user.username.toLowerCase())
          .maybeSingle();

        if (data && data.password !== cleanOld) {
          return { success: false, error: "Current password does not match." };
        }

        // Update password in Supabase
        const { error: updateError } = await supabase
          .from("app_users")
          .update({ password: cleanNew })
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
