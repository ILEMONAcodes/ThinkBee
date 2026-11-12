"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getSupabase } from "@/lib/auth/client";
import { clearLockAfterSignOut } from "@/lib/app-lock/session";
import { setLockState, useAppLock } from "@/lib/app-lock/state";

type Identity = { owner: string | null; ready: boolean; error?: unknown };
const IdentityContext = createContext<Identity>({ owner: null, ready: false });

export function AccountProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [query] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } }));
  const [identity, setIdentity] = useState<Identity>({ owner: null, ready: false });
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    try {
      const supabase = getSupabase();
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Do not await auth methods inside this callback (the SDK holds its session lock).
        if (active) setIdentity({ owner: session?.user.id ?? null, ready: true });
        if (event === "SIGNED_OUT") {
          query.clear();
          void clearLockAfterSignOut().catch(() => {
            if (useAppLock.getState().record) setLockState("unavailable", useAppLock.getState().record, true);
          });
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void supabase.auth.getSession().then(({ data: session, error }) => {
        if (active) setIdentity({ owner: session.session?.user.id ?? null, ready: true, error });
      }).catch((error: unknown) => { if (active) setIdentity({ owner: null, ready: true, error }); });
    } catch (error) { queueMicrotask(() => { if (active) setIdentity({ owner: null, ready: true, error }); }); }
    return () => { active = false; unsubscribe(); query.clear(); };
  }, [query]);
  return <IdentityContext.Provider value={identity}><QueryClientProvider client={query}>{children}</QueryClientProvider></IdentityContext.Provider>;
}

export function useIdentity() { return useContext(IdentityContext); }
