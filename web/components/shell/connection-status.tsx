"use client";

import { WifiSlash } from "@phosphor-icons/react/dist/csr/WifiSlash";
import { useTranslations } from "next-intl";

import { useOnline } from "@/lib/hooks/use-online";

export function ConnectionStatus() {
  const t = useTranslations("Shell");
  const online = useOnline();
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {!online ? <div className="connection-band"><WifiSlash aria-hidden size={22} className="shrink-0" /><p>{t("offline")}</p></div> : null}
    </div>
  );
}
