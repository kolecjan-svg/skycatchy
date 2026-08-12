import type { DealDisplay } from '../types';

let _deal: DealDisplay | null = null;
const _contentCache = new Map<string, string>();

export const dealPreviewStore = {
  set(deal: DealDisplay) { _deal = deal; },
  get(): DealDisplay | null { return _deal; },
  clear() { _deal = null; },
  cacheContent(id: string, content: string) { _contentCache.set(id, content); },
  getCachedContent(id: string): string | null { return _contentCache.get(id) ?? null; },
};
