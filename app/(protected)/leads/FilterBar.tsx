"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, SlidersHorizontal, Globe, Star } from "lucide-react";

type Filters = {
  category: string;
  locality: string;
  search: string;
  status: string;
  websiteStatus: string;
  noWebsiteOnly: boolean;
  shortlistedOnly: boolean;
  minRating: string;
  minReviews: string;
  hasPhone: string;
  hasNotes: string;
  followUp: string;
  sortBy: string;
};

const STATUS_OPTIONS = ["new", "contacted", "interested", "quoted", "won", "lost"];
const WEBSITE_STATUS_OPTIONS = ["none", "instagram_only", "has_website"];
const MIN_RATING_OPTIONS = ["3", "3.5", "4", "4.5"];
const MIN_REVIEWS_OPTIONS = ["10", "25", "50", "100"];
const FOLLOW_UP_OPTIONS: { value: string; label: string }[] = [
  { value: "never", label: "Never contacted" },
  { value: "stale7", label: "Not contacted in 7+ days" },
  { value: "stale14", label: "Not contacted in 14+ days" },
  { value: "stale30", label: "Not contacted in 30+ days" },
];
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "rating_desc", label: "Highest rated" },
  { value: "reviews_desc", label: "Most reviews" },
  { value: "created_desc", label: "Newest" },
  { value: "name_asc", label: "Name A-Z" },
];

const SEARCH_DEBOUNCE_MS = 400;

function FilterSelect({
  value,
  onChange,
  children,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-slate-500">{children}</label>;
}

function countActive(f: Filters): number {
  return [
    f.category,
    f.locality,
    f.status,
    !f.noWebsiteOnly && f.websiteStatus,
    f.noWebsiteOnly,
    f.shortlistedOnly,
    f.minRating,
    f.minReviews,
    f.hasPhone,
    f.hasNotes,
    f.followUp,
  ].filter(Boolean).length;
}

export default function FilterBar({ initial }: { initial: Filters }) {
  const router = useRouter();
  const [filters, setFilters] = useState(initial);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [expanded, setExpanded] = useState(() => countActive(initial) > 0);
  const isFirstRender = useRef(true);

  const activeCount = countActive(filters);

  function pushFilters(next: Filters) {
    const params = new URLSearchParams();
    if (next.category) params.set("category", next.category);
    if (next.locality) params.set("locality", next.locality);
    if (next.search) params.set("search", next.search);
    if (next.status) params.set("status", next.status);
    if (next.noWebsiteOnly) {
      params.set("noWebsiteOnly", "true");
    } else if (next.websiteStatus) {
      params.set("websiteStatus", next.websiteStatus);
    }
    if (next.shortlistedOnly) params.set("shortlistedOnly", "true");
    if (next.minRating) params.set("minRating", next.minRating);
    if (next.minReviews) params.set("minReviews", next.minReviews);
    if (next.hasPhone) params.set("hasPhone", next.hasPhone);
    if (next.hasNotes) params.set("hasNotes", next.hasNotes);
    if (next.followUp) params.set("followUp", next.followUp);
    if (next.sortBy && next.sortBy !== "updated_desc") params.set("sortBy", next.sortBy);
    router.push(`/leads?${params.toString()}`);
  }

  function applyFilters(next: Filters) {
    setFilters(next);
    pushFilters(next);
  }

  // Debounce the free-text search box so every keystroke doesn't trigger a
  // full navigation + DB query — only push once typing pauses.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      const next = { ...filters, search: searchInput };
      setFilters(next);
      pushFilters(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 p-3 sm:p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search leads..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:py-2"
          />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors sm:py-2 ${
            expanded || activeCount > 0
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <FilterLabel>Category</FilterLabel>
              <input
                value={filters.category}
                onChange={(e) => applyFilters({ ...filters, category: e.target.value })}
                placeholder="e.g. cafe"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <FilterLabel>Locality</FilterLabel>
              <input
                value={filters.locality}
                onChange={(e) => applyFilters({ ...filters, locality: e.target.value })}
                placeholder="e.g. Bandra West"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <FilterLabel>Status</FilterLabel>
              <FilterSelect value={filters.status} onChange={(v) => applyFilters({ ...filters, status: v })}>
                <option value="">All</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div>
              <FilterLabel>Website</FilterLabel>
              <FilterSelect
                value={filters.noWebsiteOnly ? "" : filters.websiteStatus}
                onChange={(v) => applyFilters({ ...filters, websiteStatus: v })}
                disabled={filters.noWebsiteOnly}
              >
                <option value="">All</option>
                {WEBSITE_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div>
              <FilterLabel>Sort by</FilterLabel>
              <FilterSelect value={filters.sortBy} onChange={(v) => applyFilters({ ...filters, sortBy: v })}>
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div>
              <FilterLabel>Min rating</FilterLabel>
              <FilterSelect value={filters.minRating} onChange={(v) => applyFilters({ ...filters, minRating: v })}>
                <option value="">Any</option>
                {MIN_RATING_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}+ stars
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div>
              <FilterLabel>Min reviews</FilterLabel>
              <FilterSelect value={filters.minReviews} onChange={(v) => applyFilters({ ...filters, minReviews: v })}>
                <option value="">Any</option>
                {MIN_REVIEWS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}+ reviews
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div>
              <FilterLabel>Phone</FilterLabel>
              <FilterSelect value={filters.hasPhone} onChange={(v) => applyFilters({ ...filters, hasPhone: v })}>
                <option value="">Any</option>
                <option value="true">Has phone</option>
                <option value="false">No phone</option>
              </FilterSelect>
            </div>
            <div>
              <FilterLabel>Notes</FilterLabel>
              <FilterSelect value={filters.hasNotes} onChange={(v) => applyFilters({ ...filters, hasNotes: v })}>
                <option value="">Any</option>
                <option value="true">Has notes</option>
                <option value="false">No notes</option>
              </FilterSelect>
            </div>
            <div>
              <FilterLabel>Follow-up</FilterLabel>
              <FilterSelect value={filters.followUp} onChange={(v) => applyFilters({ ...filters, followUp: v })}>
                <option value="">Any</option>
                {FOLLOW_UP_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </FilterSelect>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => applyFilters({ ...filters, noWebsiteOnly: !filters.noWebsiteOnly })}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filters.noWebsiteOnly
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              No website only
            </button>
            <button
              type="button"
              onClick={() => applyFilters({ ...filters, shortlistedOnly: !filters.shortlistedOnly })}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filters.shortlistedOnly
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${filters.shortlistedOnly ? "fill-amber-500" : ""}`} />
              Shortlisted only
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
