import { Hash, Hexagon, Plant, Users } from "@phosphor-icons/react/dist/ssr";

interface ChatSpaceAvatarProps {
  id: string;
  kind: "community" | "group";
  name?: string;
  is_system?: boolean;
  prominent?: boolean;
}

export function ChatSpaceAvatar({ id, kind, name, is_system, prominent = false }: ChatSpaceAvatarProps) {
  const isBeekeepers = is_system && name === "Beekeepers";
  const isGeneralFarmers = is_system && name === "General Farmers";

  const Icon =
    isBeekeepers ? Hexagon :
    isGeneralFarmers ? Plant :
    kind === "community" ? Users : Hash;
  const color =
    isBeekeepers ? "bg-comb-400 text-on-accent" :
    isGeneralFarmers ? (prominent ? "bg-forest-300 text-forest-950" : "bg-forest-600 text-on-brand") :
    "bg-sunken text-link";

  return (
    <span
      aria-hidden="true"
      className={`comb-cell flex size-12 shrink-0 items-center justify-center ${color}`}
    >
      <Icon size={24} />
    </span>
  );
}
