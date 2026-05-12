import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User, Signals } from "../types";

interface SessionState {
  user: User | null;
  riskOverrides: Partial<Signals>;
}

interface SessionContextValue extends SessionState {
  setUser: (u: User | null) => void;
  setRiskOverrides: (s: Partial<Signals>) => void;
  patchRiskOverrides: (patch: Partial<Signals>) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const STORAGE_KEY = "bankwebapp.session.v1";

function load(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, riskOverrides: {} };
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user ?? null,
      riskOverrides: parsed.riskOverrides ?? {},
    };
  } catch {
    return { user: null, riskOverrides: {} };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setUser = useCallback((user: User | null) => {
    setState((s) => ({ ...s, user }));
  }, []);

  const setRiskOverrides = useCallback((riskOverrides: Partial<Signals>) => {
    setState((s) => ({ ...s, riskOverrides }));
  }, []);

  const patchRiskOverrides = useCallback((patch: Partial<Signals>) => {
    setState((s) => ({ ...s, riskOverrides: { ...s.riskOverrides, ...patch } }));
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, setUser, setRiskOverrides, patchRiskOverrides }),
    [state, setUser, setRiskOverrides, patchRiskOverrides]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
