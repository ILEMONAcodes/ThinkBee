"use client";

import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";

import { useIdentity } from "@/components/auth/account-provider";
import { setupDb } from "@/lib/db/onboarding";
import { loadAccount } from "@/lib/onboarding/account";
import { syncSetup } from "@/lib/onboarding/sync";

export function useAccount() {
  const identity = useIdentity();
  const account = useQuery({
    queryKey: ["account", identity.owner], enabled: !!identity.owner,
    queryFn: () => loadAccount(identity.owner!), networkMode: "always",
  });
  const draft = useLiveQuery(() => identity.owner ? setupDb.setup.get(identity.owner).catch(() => undefined) : undefined, [identity.owner]);
  useEffect(() => {
    if (!identity.owner) return;
    const owner = identity.owner;
    const run = () => { if (document.visibilityState !== "hidden") void syncSetup(owner).catch(() => undefined); };
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);
    const timer = window.setInterval(run, 60_000);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
      window.clearInterval(timer);
    };
  }, [identity.owner]);
  return { ...identity, account, draft };
}
