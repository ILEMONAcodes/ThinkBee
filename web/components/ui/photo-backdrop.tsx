import Image from "next/image";

export function PhotoBackdrop({ src, sizes }: Readonly<{
  src: string;
  sizes: string;
}>) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
      <span className="absolute inset-0 bg-linear-to-t from-forest-950 via-forest-950/60 to-forest-950/5" />
    </span>
  );
}
