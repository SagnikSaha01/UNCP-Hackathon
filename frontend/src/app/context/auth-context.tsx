import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const AUTH_STORAGE_KEY = "aura-auth";
const API_BASE = "http://localhost:8000";

interface AuthUser {
  userId: string;
  patientId: string;
  email: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  // kept for Solana path
  walletAddress: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithWallet: (address: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.userId) {
          setUser(data);
        } else if (data.wallet) {
          setWalletAddress(data.wallet);
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.detail ?? "Login failed." };
      }
      const data = await res.json();
      const authUser: AuthUser = {
        userId: data.user_id,
        patientId: data.patient_id,
        email: data.email,
        name: data.name,
      };
      setUser(authUser);
      setWalletAddress(null);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Is the backend running?" };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.detail ?? "Registration failed." };
      }
      const data = await res.json();
      const authUser: AuthUser = {
        userId: data.user_id,
        patientId: data.patient_id,
        email: data.email,
        name: data.name,
      };
      setUser(authUser);
      setWalletAddress(null);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Is the backend running?" };
    }
  };

  const loginWithWallet = (address: string) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ wallet: address }));
      setUser(null);
      setWalletAddress(address);
    } catch {
      // ignore
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setWalletAddress(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user || !!walletAddress,
        user,
        walletAddress,
        login,
        register,
        loginWithWallet,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
