"use client";

import { useEffect, useState } from "react";

interface VideoPlayerProps {
  youtubeId: string;
  title: string;
}

/** Start position from a clip-search link such as /episodes/…?t=1121. */
export function readStartSeconds(): number {
  const value = Number(new URLSearchParams(window.location.search).get("t"));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function VideoPlayer({ youtubeId, title }: VideoPlayerProps) {
  const [start, setStart] = useState(0);

  useEffect(() => {
    setStart(readStartSeconds());
  }, []);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-foreground">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}${start ? `?start=${start}` : ""}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
