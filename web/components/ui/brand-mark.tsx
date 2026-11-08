import Image from "next/image";
import type { CSSProperties } from "react";

type BrandMarkProps = Readonly<{
  kind?: "wordmark" | "short";
  surface?: "auto" | "light" | "dark";
  width?: number;
  className?: string;
  priority?: boolean;
}>;

/** Supplied transparent masters, selected by the surface rather than recoloured. */
export function BrandMark({ kind = "wordmark", surface = "auto", width = 132, className = "", priority = false }: BrandMarkProps) {
  const height = kind === "short" ? width : Math.round(width * 720 / 1766);
  return <span aria-hidden="true" className={`brand-mark ${className}`} data-surface={surface} style={{ "--brand-width": `${width}px` } as CSSProperties}>
    {surface !== "dark" ? <Image alt="" className="brand-on-light" src={`/brand/thinkbee-${kind}.svg`} width={width} height={height} priority={priority} /> : null}
    {surface !== "light" ? <Image alt="" className="brand-on-dark" src={`/brand/thinkbee-${kind}-dark.svg`} width={width} height={height} priority={priority} /> : null}
  </span>;
}
