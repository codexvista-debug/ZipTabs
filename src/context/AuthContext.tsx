"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync Supabase Auth session on mount and listen to changes
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted && session?.user) {
          setUser({
            id: session.user.id,
            name:
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0] ||
              "Admin",
            email: session.user.email || "",
            role: "Authorized Member",
          });
        }
      } catch (err) {
        console.error("Error loading Supabase auth session:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    checkSession();

    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            name:
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0] ||
              "Admin",
            email: session.user.email || "",
            role: "Authorized Member",
          });
        } else {
          setUser(null);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password: string) => {
    const trimmedEmail = email.trim();

    if (!supabase) {
      return {
        success: false,
        error: "Supabase client is not initialized. Please check credentials.",
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.user) {
        setUser({
          id: data.user.id,
          name:
            data.user.user_metadata?.name ||
            data.user.email?.split("@")[0] ||
            "Admin",
          email: data.user.email || "",
          role: "Authorized Member",
        });
        return { success: true };
      }

      return { success: false, error: "Login failed. Please try again." };
    } catch (err: any) {
      return { success: false, error: err.message || "An unexpected error occurred." };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const trimmedEmail = email.trim();

    if (!name.trim()) {
      return { success: false, error: "Name is required." };
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return { success: false, error: "Valid email address is required." };
    }
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    if (!supabase) {
      return {
        success: false,
        error: "Supabase client is not initialized. Please check credentials.",
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.session) {
        // Logged in immediately (email confirmation disabled in Supabase)
        setUser({
          id: data.user!.id,
          name: name.trim(),
          email: trimmedEmail,
          role: "Authorized Member",
        });
        return { success: true };
      } else if (data?.user) {
        // Email confirmation is required by Supabase default settings
        return {
          success: true,
          error:
            "Account created! Please check your inbox to confirm your email, or disable 'Confirm email' in Supabase Auth Settings to log in instantly.",
        };
      }

      return { success: false, error: "Registration failed." };
    } catch (err: any) {
      return { success: false, error: err.message || "An unexpected error occurred." };
    }
  };

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Error signing out:", err);
      }
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
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
