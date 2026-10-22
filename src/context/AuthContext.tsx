"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "ziptabs_auth_user";
const REGISTERED_USERS_KEY = "ziptabs_registered_users";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore parsing error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Basic verification: accept default admin or registered users
    const trimmedEmail = email.trim().toLowerCase();

    // Default admin account
    if (trimmedEmail === "admin@ziptabs.com" && password === "admin123") {
      const adminUser: User = {
        id: "admin-1",
        name: "Admin User",
        email: "admin@ziptabs.com",
        role: "Workspace Owner",
      };
      setUser(adminUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
      return { success: true };
    }

    // Check custom registered users
    try {
      const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
      const registered = rawUsers ? JSON.parse(rawUsers) : [];
      const match = registered.find(
        (u: any) => u.email.toLowerCase() === trimmedEmail && u.password === password
      );

      if (match) {
        const loggedUser: User = {
          id: match.id,
          name: match.name,
          email: match.email,
          role: "Authorized Member",
        };
        setUser(loggedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
        return { success: true };
      }
    } catch {
      // ignore
    }

    return {
      success: false,
      error: "Invalid email or password. Use demo account admin@ziptabs.com / admin123 or create an account.",
    };
  };

  const register = async (name: string, email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!name.trim()) {
      return { success: false, error: "Name is required." };
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return { success: false, error: "Valid email address is required." };
    }
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    try {
      const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
      const registered = rawUsers ? JSON.parse(rawUsers) : [];

      if (registered.some((u: any) => u.email.toLowerCase() === trimmedEmail)) {
        return { success: false, error: "An account with this email already exists." };
      }

      const newUser = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: trimmedEmail,
        password: password,
      };

      registered.push(newUser);
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registered));

      const authUser: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: "Authorized Member",
      };

      setUser(authUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: "Registration failed. Please try again." };
    }
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
