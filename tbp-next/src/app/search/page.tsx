import type { Metadata } from "next";
import { ClipSearch } from "@/components/search/ClipSearch";

export const metadata: Metadata = {
  title: "Search Clips",
  description:
    "Search what was said on The Bitcoin Podcast Network and jump straight to the moment.",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
          Search Clips
        </h1>
        <p className="mt-3 text-sm text-muted">
          Type a word or phrase. We’ll find the moment it was said and play it for you.
        </p>
      </div>
      <ClipSearch syncUrl autoFocus />
    </div>
  );
}
