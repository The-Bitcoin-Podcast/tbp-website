"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

/** Sends one event to Google Analytics, with whatever the element says about itself. */
function report(name: string, element: HTMLElement) {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!gtag) return;
  const { sponsor, sponsorSlot, sponsorTarget } = element.dataset;
  const params: Record<string, string> = { page_path: window.location.pathname };
  if (sponsor) params.sponsor = sponsor;
  if (sponsorSlot) params.sponsor_slot = sponsorSlot;
  if (sponsorTarget) params.sponsor_target = sponsorTarget;
  gtag("event", name, params);
}

/**
 * Sponsor reporting. Renders nothing; it watches the page for two markers:
 *
 * - `data-sponsor-view`: reports `sponsor_impression` once per page view, when
 *   at least half of the element has been on screen.
 * - `data-sponsor-event="<name>"`: reports that event when the element is clicked.
 *
 * Both carry `data-sponsor`, `data-sponsor-slot` and `data-sponsor-target`.
 */
export function SponsorAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const seen = new WeakSet<Element>();
    const views = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || seen.has(entry.target)) continue;
          seen.add(entry.target);
          views.unobserve(entry.target);
          report("sponsor_impression", entry.target as HTMLElement);
        }
      },
      { threshold: 0.5 }
    );
    const watch = () => {
      for (const element of document.querySelectorAll("[data-sponsor-view]")) {
        if (!seen.has(element)) views.observe(element);
      }
    };
    watch();
    // Page content can arrive after this effect runs on a client-side navigation.
    const additions = new MutationObserver(watch);
    additions.observe(document.body, { childList: true, subtree: true });

    return () => {
      views.disconnect();
      additions.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const element = (event.target as Element | null)?.closest<HTMLElement>("[data-sponsor-event]");
      if (element?.dataset.sponsorEvent) report(element.dataset.sponsorEvent, element);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
