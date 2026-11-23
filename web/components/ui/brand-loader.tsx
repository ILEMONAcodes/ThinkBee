"use client";

import { BrandMark } from "@/components/ui/brand-mark";
import { useTranslations } from "next-intl";

interface BrandLoaderProps {
  size?: number;
  label?: string;
  className?: string;
}

/** Small Think Bee short mark with a circular loading ring around it. */
export function BrandLoader({ size = 56, label, className = "" }: BrandLoaderProps) {
  const t = useTranslations("Setup");
  return (
    <div className={`brand-loader ${className}`} role="status" aria-label={label || t("loading")}>
      <div className="brand-loader-ring" style={{ width: size, height: size }} aria-hidden="true">
        <BrandMark kind="short" width={Math.round(size * 0.55)} surface="auto" />
        <span className="brand-loader-spinner" />
      </div>
    </div>
  );
}
