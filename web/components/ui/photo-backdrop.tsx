import Image from "next/image";
import { getPlaceholder } from "@/lib/images/placeholders";

export function PhotoBackdrop({ src, sizes, fadeTo }: Readonly<{
  src: string;
  sizes: string;
  fadeTo?: "forest";
}>) {
  const placeholder = getPlaceholder(src);
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-opacity duration-300"
        placeholder="blur"
        blurDataURL={placeholder}
      />
      <span className={fadeTo === "forest"
        ? "absolute inset-0 bg-linear-to-t from-forest-900 via-forest-900/30 to-forest-950/40"
        : "absolute inset-0 bg-linear-to-t from-forest-950 via-forest-950/60 to-forest-950/5"} />
    </span>
  );
}
