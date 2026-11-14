"use client";

import { useEffect, useRef } from "react";
import { readStartSeconds } from "./VideoPlayer";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
}

export function AudioPlayer({ audioUrl, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Arriving from a clip-search link (?t=…): cue the audio to that second.
  useEffect(() => {
    const audio = audioRef.current;
    const start = readStartSeconds();
    if (!audio || !start) return;
    const seek = () => {
      audio.currentTime = start;
    };
    if (audio.readyState >= 1) seek();
    else audio.addEventListener("loadedmetadata", seek, { once: true });
    return () => audio.removeEventListener("loadedmetadata", seek);
  }, []);

  return (
    <div className="rounded-2xl bg-surface-light p-5">
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-accent">
        Listen to episode
      </p>
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        className="w-full"
        aria-label={`Play ${title}`}
      >
        <source src={audioUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
