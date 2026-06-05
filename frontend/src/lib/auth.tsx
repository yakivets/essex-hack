import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "./api";
import { setAuthToken } from "./api";
import type { User } from "./types";

const TOKEN_KEY = "pactpilot_token";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean; // true while bootstrapping the session from a stored token
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function persistToken(token: string | null) {
  setAuthToken(token); // keep the api client's Authorization header in sync
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: if a token is in localStorage, adopt it and resolve the user.
  useEffect(() => {
    const stored = readStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    setAuthToken(stored);
    setToken(stored);
    api
      .getMe()
      .then((u) => setUser(u))
      .catch(() => {
        // Token invalid/expired — clear it.
        persistToken(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const adopt = useCallback((tok: string, u: User) => {
    persistToken(tok);
    setToken(tok);
    setUser(u);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      adopt(res.token, res.user);
      return res.user;
    },
    [adopt],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await api.register(email, password);
      adopt(res.token, res.user);
      return res.user;
    },
    [adopt],
  );

  const logout = useCallback(() => {
    persistToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
