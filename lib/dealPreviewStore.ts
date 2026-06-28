import type { DealDisplay } from '../types';

let _deal: DealDisplay | null = null;

export const dealPreviewStore = {
  set(deal: DealDisplay) { _deal = deal; },
  get(): DealDisplay | null { return _deal; },
  clear() { _deal = null; },
};
