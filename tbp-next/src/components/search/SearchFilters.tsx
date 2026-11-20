"use client";

import { useId, useMemo } from "react";
import {
  AGES,
  DEFAULT_FILTERS,
  LENGTHS,
  SORTS,
  facet,
  isDefault,
  type Filters,
  type Length,
  type Sort,
} from "./filters";
import type { EpisodeHeadline } from "./pagefind";

interface SearchFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  /** Every episode the search found, before filtering. */
  episodes: EpisodeHeadline[];
}

const selectClass = (active: boolean) =>
  `min-w-0 max-w-full rounded-full border bg-background py-1.5 pl-3 pr-2 text-[13px] font-medium text-foreground outline-none transition-colors focus-visible:border-foreground ${
    active ? "border-foreground bg-brand-tint" : "border-border hover:border-foreground"
  }`;

/** The row of sort and filter controls above the search results. */
export function SearchFilters({ filters, onChange, episodes }: SearchFiltersProps) {
  const id = useId();
  const { shows, years } = useMemo(() => {
    const today = new Date();
    return {
      shows: facet(episodes, filters, "show", today),
      years: facet(episodes, filters, "when", today),
    };
  }, [episodes, filters]);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Sort and filter results">
      <label className="sr-only" htmlFor={`${id}-sort`}>
        Sort by
      </label>
      <select
        id={`${id}-sort`}
        value={filters.sort}
        onChange={(event) => set({ sort: event.target.value as Sort })}
        className={selectClass(filters.sort !== "relevance")}
      >
        {SORTS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor={`${id}-when`}>
        Episode age
      </label>
      <select
        id={`${id}-when`}
        value={filters.when}
        onChange={(event) => set({ when: event.target.value })}
        className={selectClass(filters.when !== "any")}
      >
        <option value="any">Any time</option>
        {AGES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {/* Keeps a year from a shared link selectable even when it has no results. */}
        {/^\d{4}$/.test(filters.when) && !years.some(([year]) => year === filters.when) && (
          <option value={filters.when}>{filters.when} (0)</option>
        )}
        {years.length > 0 && (
          <optgroup label="By year">
            {years.map(([year, count]) => (
              <option key={year} value={year}>
                {year} ({count})
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <label className="sr-only" htmlFor={`${id}-show`}>
        Show
      </label>
      <select
        id={`${id}-show`}
        value={filters.show}
        onChange={(event) => set({ show: event.target.value })}
        className={selectClass(filters.show !== "all")}
      >
        <option value="all">All shows</option>
        {filters.show !== "all" && !shows.some(([show]) => show === filters.show) && (
          <option value={filters.show}>{filters.show} (0)</option>
        )}
        {shows.map(([show, count]) => (
          <option key={show} value={show}>
            {show} ({count})
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor={`${id}-length`}>
        Episode length
      </label>
      <select
        id={`${id}-length`}
        value={filters.length}
        onChange={(event) => set({ length: event.target.value as Length })}
        className={selectClass(filters.length !== "any")}
      >
        {LENGTHS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        aria-pressed={filters.video}
        onClick={() => set({ video: !filters.video })}
        className={`rounded-full border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors ${
          filters.video ? "border-foreground bg-brand-tint" : "border-border hover:border-foreground"
        }`}
      >
        Has video
      </button>

      {!isDefault(filters) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="px-1.5 py-1.5 text-[13px] font-medium text-muted underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Reset
        </button>
      )}
    </div>
  );
}
