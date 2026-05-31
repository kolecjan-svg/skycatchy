// types/index.ts – SkyCatchy Mobile type definitions

export interface Deal {
  id: string;
  name: string;
  description: string | null;
  link: string;
  image: string | null;
  source: string;
  publish_date: string;
  created_at: string;
  lang: string;
  deal_translations?: DealTranslation[];
}

export interface DealTranslation {
  id: string;
  deal_id: string;
  lang: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Source {
  id: string;
  name: string;
  rss_url: string;
  active: boolean;
  created_at: string;
  category?: SourceCategory;
}

export type SourceCategory = 'czech' | 'slovak' | 'global';

export interface SourceGroup {
  category: SourceCategory;
  label: string;
  sources: Source[];
}

export interface DealDisplay {
  id: string;
  name: string;
  description: string | null;
  link: string;
  image: string | null;
  source: string;
  publish_date: string;
  lang: string;
  isTranslated: boolean;
}

export interface FilterState {
  selectedSources: Set<string>;
  allSelected: boolean;
}

export interface PaginationState {
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}
