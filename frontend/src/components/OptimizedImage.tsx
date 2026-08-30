"use client";

import React, { useMemo, useState } from "react";

type OptimizedImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "loading" | "fetchPriority"> & {
  src?: string;
  fallbackSrc?: string;
  priority?: boolean;
  sizes?: string;
};

const responsiveWidths = [480, 768, 1200, 1600];

function withWidth(source: string, width: number): string {
  try {
    const url = new URL(source);
    if (url.hostname.includes("images.unsplash.com")) {
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", "82");
    }
    return url.toString();
  } catch {
    return source;
  }
}

export function OptimizedImage({ src, fallbackSrc, alt = "", priority = false, sizes = "100vw", className, onError, ...props }: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const source = hasError && fallbackSrc ? fallbackSrc : src || fallbackSrc;
  const srcSet = useMemo(() => source ? responsiveWidths.map((width) => `${withWidth(source, width)} ${width}w`).join(", ") : undefined, [source]);

  if (!source) return null;

  return (
    <img
      {...props}
      src={withWidth(source, 1200)}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={className}
      onError={(event) => {
        if (!hasError && fallbackSrc && source !== fallbackSrc) setHasError(true);
        onError?.(event);
      }}
    />
  );
}

export function optimizeImageUrl(source: string, width = 1200): string {
  return withWidth(source, width);
}