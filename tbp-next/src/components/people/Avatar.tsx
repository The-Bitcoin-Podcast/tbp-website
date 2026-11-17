"use client";

import { useState } from "react";

/* ─── Avatar: a profile photo when we have one, initials otherwise ─────── */

const AVATAR_COLORS = ["#f7931a", "#2563eb", "#6d28d9", "#db2777", "#059669", "#0891b2", "#dc2626", "#ca8a04", "#4f46e5", "#0d9488"];

function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function colorFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({
  name,
  src,
  size = 48,
  className = "",
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`flex-shrink-0 rounded-full bg-surface-light object-cover ring-1 ring-border ${className}`}
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${className}`}
      style={{ ...style, backgroundColor: colorFor(name) }}
    >
      {initials(name)}
    </span>
  );
}
