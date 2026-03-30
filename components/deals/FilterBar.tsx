"use client";

import { Search, ChevronDown, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUiTranslations } from "@/hooks/useUiTranslations";
import {
  groupSourcesByCategory,
  CATEGORY_ORDER,
  type SourceCategory,
} from "@/lib/sourceCategories";

export interface Filters {
  search: string;
  sources: string[];
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  sources: string[];
}

const CATEGORY_LABEL_KEYS: Record<SourceCategory, string> = {
  cz: "cz_sources",
  sk: "sk_sources",
  global: "global_sources",
};

export function FilterBar({ filters, onChange, sources }: FilterBarProps) {
  const { t } = useUiTranslations();
  const allSelected = filters.sources.length === 0;
  const isNoneSelected =
    filters.sources.length === 1 && filters.sources[0] === "__deselected__";

  const grouped = groupSourcesByCategory(sources);

  const toggleSource = (source: string) => {
    const current = allSelected ? [...sources] : isNoneSelected ? [] : [...filters.sources];
    const idx = current.indexOf(source);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(source);
    if (current.length === 0) {
      onChange({ ...filters, sources: ["__deselected__"] });
    } else {
      onChange({ ...filters, sources: current.length === sources.length ? [] : current });
    }
  };

  const toggleAll = () => {
    if (allSelected) onChange({ ...filters, sources: ["__deselected__"] });
    else onChange({ ...filters, sources: [] });
  };

  const toggleCategory = (category: SourceCategory) => {
    const categorySources = grouped[category];
    if (categorySources.length === 0) return;
    const current = allSelected ? [...sources] : isNoneSelected ? [] : [...filters.sources];
    const allInCategory = categorySources.every((s) => current.includes(s));
    let next: string[];
    if (allInCategory) {
      next = current.filter((s) => !categorySources.includes(s));
    } else {
      const set = new Set(current);
      categorySources.forEach((s) => set.add(s));
      next = [...set];
    }
    if (next.length === 0) onChange({ ...filters, sources: ["__deselected__"] });
    else onChange({ ...filters, sources: next.length === sources.length ? [] : next });
  };

  const isCategoryChecked = (category: SourceCategory): boolean => {
    if (allSelected) return true;
    if (isNoneSelected) return false;
    return grouped[category].length > 0 && grouped[category].every((s) => filters.sources.includes(s));
  };

  const isCategoryIndeterminate = (category: SourceCategory): boolean => {
    if (allSelected || isNoneSelected) return false;
    const checked = grouped[category].filter((s) => filters.sources.includes(s)).length;
    return checked > 0 && checked < grouped[category].length;
  };

  const label = allSelected
    ? t("all_sources")
    : isNoneSelected
      ? `0 ${t("sources_selected")}`
      : filters.sources.length === 1
        ? filters.sources[0]
        : `${filters.sources.length} ${t("sources_selected")}`;

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("search_placeholder")}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>
      {sources.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-48 shrink-0 justify-between text-sm font-normal max-sm:w-auto max-sm:px-3"
            >
              <span className="truncate sm:inline hidden">{label}</span>
              <span className="sm:hidden">{allSelected ? t("all_sources_short") : label}</span>
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent transition-colors"
              onClick={toggleAll}
            >
              <Checkbox checked={allSelected} tabIndex={-1} className="pointer-events-none" />
              {t("all_sources")}
            </div>
            <div className="my-1 h-px bg-border" />

            {CATEGORY_ORDER.map((cat) => {
              const catSources = grouped[cat];
              if (catSources.length === 0) return null;
              const checked = isCategoryChecked(cat);
              const indeterminate = isCategoryIndeterminate(cat);
              return (
                <div key={cat} className="mt-1.5 first:mt-0">
                  <div
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold whitespace-nowrap text-muted-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => toggleCategory(cat)}
                  >
                    <Checkbox
                      checked={indeterminate ? "indeterminate" : checked}
                      tabIndex={-1}
                      className="pointer-events-none"
                    />
                    {t(CATEGORY_LABEL_KEYS[cat] as any)}
                  </div>
                  {catSources.map((s) => (
                    <div
                      key={s}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 pl-7 text-sm font-normal text-foreground/80 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => toggleSource(s)}
                    >
                      <Checkbox
                        checked={allSelected || filters.sources.includes(s)}
                        tabIndex={-1}
                        className="pointer-events-none"
                      />
                      <span className="truncate">{s}</span>
                    </div>
                  ))}
                </div>
              );
            })}

            {!allSelected && (
              <>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={toggleAll}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("reset_filters")}
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
