"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plane } from "lucide-react";

import { useLastVisit } from "@/hooks/useLastVisit";
import { useTranslatedDeals } from "@/hooks/useTranslatedDeals";
import { useUiTranslations } from "@/hooks/useUiTranslations";
import { useDebounce } from "@/hooks/useDebounce";
import { supabaseExternal as supabase } from "@/lib/supabase/external-client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FilterBar, type Filters } from "@/components/deals/FilterBar";
import { DealCard, type Deal } from "@/components/deals/DealCard";
import { Skeleton } from "@/components/ui/skeleton";

const DEALS_PER_PAGE = 50;
const DEALS_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

async function fetchRecentDeals(): Promise<Deal[]> {
  const since = new Date(Date.now() - DEALS_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(800);
  if (error) throw error;
  return (data ?? []) as Deal[];
}

function DealGridWithDivider({
  deals,
  lastVisit,
  t,
}: {
  deals: Deal[];
  lastVisit: number;
  t: (k: string) => string;
}) {
  const dividerIndex =
    lastVisit > 0
      ? deals.findIndex((d) => new Date(d.created_at).getTime() <= lastVisit)
      : -1;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {deals.map((deal, i) => (
        <React.Fragment key={deal.id}>
          {i === dividerIndex && dividerIndex > 0 && (
            <div className="col-span-full flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                {t("you_left_off_here")}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          <DealCard deal={deal} index={i} />
        </React.Fragment>
      ))}
    </div>
  );
}

function DealsLoadingSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasDeals,
  t,
}: {
  hasDeals: boolean;
  t: (k: string) => string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Plane className="mb-4 h-12 w-12 text-muted-foreground/40" />
      <h3 className="text-lg font-medium">
        {hasDeals ? t("no_deals_match") : t("no_deals_yet")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasDeals ? t("no_deals_filter_hint") : t("no_deals_hint")}
      </p>
    </div>
  );
}

export default function HomePage() {
  const { t } = useUiTranslations();
  const lastVisit = useLastVisit();
  const [filters, setFilters] = useState<Filters>({ search: "", sources: [] });
  const [visibleCount, setVisibleCount] = useState(DEALS_PER_PAGE);
  const debouncedSearch = useDebounce(filters.search, 300);

  const { data: rawDeals = [], isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: fetchRecentDeals,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { translatedDeals } = useTranslatedDeals(rawDeals);

  const sources = useMemo(
    () =>
      [...new Set(rawDeals.map((d) => d.source).filter(Boolean) as string[])].sort(),
    [rawDeals],
  );

  const searchQuery = debouncedSearch.trim().toLowerCase();
  const selectedSources = filters.sources;

  const filtered = useMemo(
    () =>
      translatedDeals.filter((d) => {
        if (searchQuery) {
          const name = d.name.toLowerCase();
          const desc = (d.description ?? "").toLowerCase();
          if (!name.includes(searchQuery) && !desc.includes(searchQuery)) return false;
        }
        if (selectedSources.length > 0 && !selectedSources.includes(d.source ?? "")) return false;
        return true;
      }),
    [translatedDeals, searchQuery, selectedSources],
  );

  const filterKey = `${debouncedSearch}|${selectedSources.join(",")}`;
  useEffect(() => {
    setVisibleCount(DEALS_PER_PAGE);
  }, [filterKey]);

  const visibleDeals = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + DEALS_PER_PAGE);
  }, []);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMoreRef.current) {
          isLoadingMoreRef.current = true;
          loadMore();
          setTimeout(() => { isLoadingMoreRef.current = false; }, 300);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8 space-y-6">
        <FilterBar filters={filters} onChange={setFilters} sources={sources} />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {filtered.length}{" "}
            {filtered.length !== 1 ? t("deals_found") : t("deal_found")}
          </h2>
        </div>
        {isLoading ? (
          <DealsLoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState hasDeals={translatedDeals.length > 0} t={t} />
        ) : (
          <>
            <DealGridWithDivider deals={visibleDeals} lastVisit={lastVisit} t={t} />
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}