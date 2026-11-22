import Image from "next/image";
import { getPlaceholder } from "@/lib/images/placeholders";

export function PhotoBackdrop({ src, sizes }: Readonly<{
  src: string;
  sizes: string;
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
      <span className="absolute inset-0 bg-linear-to-t from-forest-950 via-forest-950/60 to-forest-950/5" />
    </span>
  );
}
