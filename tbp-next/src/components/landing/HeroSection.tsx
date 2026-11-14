import { ClipSearch } from "@/components/search/ClipSearch";

interface HeroProps {
  /** Shown under the search box, e.g. how many moments are searchable. */
  searchHint?: string;
}

export function HeroSection({ searchHint }: HeroProps) {
  return (
    <section className="mx-auto max-w-[860px] px-6 pt-16 pb-14 text-center sm:px-8 sm:pt-24 sm:pb-16">
      <h1 className="font-display text-5xl font-extrabold leading-none sm:text-6xl lg:text-[76px]">
        Who said what, and when.
      </h1>
      <p className="mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-muted sm:text-[19px]">
        Search the podcast by what was actually said. Press play and hear it from that exact
        second.
      </p>
      <div className="mt-9">
        <ClipSearch hint={searchHint} />
      </div>
    </section>
  );
}
