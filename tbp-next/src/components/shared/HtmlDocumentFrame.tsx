"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface HtmlDocumentFrameProps {
  html: string;
  title: string;
}

/**
 * Renders a complete HTML document (such as an exported email newsletter) with
 * its own styles intact. The frame isolates it from the site's CSS in both
 * directions, and the sandbox blocks any scripts inside the document.
 */
export function HtmlDocumentFrame({ html, title }: HtmlDocumentFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(900);

  // Links inside the newsletter open in a new tab instead of inside the frame.
  const baseTag = '<base target="_blank">';
  const srcDoc = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (head) => `${head}${baseTag}`)
    : `${baseTag}${html}`;

  const measure = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.documentElement) return;
    const next = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);
    if (next > 0) setHeight(next);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const onLoad = () => {
    measure();
    const doc = frameRef.current?.contentDocument;
    // Images change the height as they finish loading.
    doc?.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", measure, { once: true });
    });
  };

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={srcDoc}
      onLoad={onLoad}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      style={{ height }}
      className="block w-full rounded-xl border border-border bg-white"
    />
  );
}
