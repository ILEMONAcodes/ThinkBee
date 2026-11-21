import { Hash, Hexagon, Plant, Users } from "@phosphor-icons/react/dist/ssr";

interface ChatSpaceAvatarProps {
  id: string;
  kind: "community" | "group";
}

export function ChatSpaceAvatar({ id, kind }: ChatSpaceAvatarProps) {
  const Icon =
    id === "beekeepers" ? Hexagon :
    id === "general-farmers" ? Plant :
    kind === "community" ? Users : Hash;
  const color =
    id === "beekeepers" ? "bg-comb-400 text-on-accent" :
    id === "general-farmers" ? "bg-forest-600 text-on-brand" :
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
