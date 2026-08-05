"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

// Self-hosted rather than hotlinked: the original source sat behind Cloudflare
// Bot Management on someone else's Supabase project with no-cache headers —
// it played in dev but got blocked once real traffic hit it from the
// production domain. Served from /public here, it's a same-origin request
// with no external dependency to break.
const DEMO_VIDEO_SRC = "/videos/product-demo.webm";

/**
 * Silent, looping, autoplaying decorative video used across the marketing
 * site's "video interview" placeholders. The autoplay attribute alone isn't
 * reliable once the <video> is mounted dynamically (e.g. inside a Radix Tabs
 * panel that appears after a click) — some browsers accept the attribute-level
 * autoplay only on initial page load, so we also call .play() explicitly once
 * the element has enough data.
 */
export function LoopingVideo({ className }: { className?: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const tryPlay = () => {
      video.play().catch(() => {
        // Autoplay can still be blocked in rare cases (e.g. data saver mode) — fail silently, poster/background color remains.
      });
    };
    if (video.readyState >= 2) tryPlay();
    else video.addEventListener("loadeddata", tryPlay, { once: true });
    return () => video.removeEventListener("loadeddata", tryPlay);
  }, []);

  return (
    <video
      ref={ref}
      src={DEMO_VIDEO_SRC}
      className={cn("size-full object-cover", className)}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
