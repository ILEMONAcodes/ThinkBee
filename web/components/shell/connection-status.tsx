import { WifiSlash } from "@phosphor-icons/react/dist/ssr/WifiSlash";
import { getTranslations } from "next-intl/server";

import { ConnectionBand } from "@/components/shell/connection-band";

export async function ConnectionStatus() {
  const t = await getTranslations("Shell");
  return (
    <ConnectionBand>
      <WifiSlash aria-hidden size={22} className="shrink-0" />
      <p>{t("offline")}</p>
    </ConnectionBand>
  );
}
