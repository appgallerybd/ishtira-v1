import type { ListSummary, PurchaseStatus, ShoppingItem } from '../types';

export const STATUS_ORDER: Record<PurchaseStatus, number> = { pending: 0, purchased: 1, skipped: 2 };
export function cycleStatus(status: PurchaseStatus): PurchaseStatus {
  return status === 'pending' ? 'purchased' : status === 'purchased' ? 'skipped' : 'pending';
}
export function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.sortOrder - b.sortOrder);
}
export function summarizeItems(items: ShoppingItem[]): ListSummary {
  const purchased = items.filter(i => i.status === 'purchased');
  const pending = items.filter(i => i.status === 'pending').length;
  const skipped = items.filter(i => i.status === 'skipped').length;
  const total = items.length;
  return {
    total, purchased: purchased.length, pending, skipped,
    progress: total ? purchased.length / total * 100 : 0,
    actualSpend: purchased.reduce((sum, item) => sum + (Number.isFinite(item.actualPrice) ? item.actualPrice! : 0), 0),
    unpricedPurchased: purchased.filter(item => item.actualPrice === undefined).length,
    estimatedSpend: items.filter(i => i.status !== 'skipped').reduce((sum, item) => sum + (item.estimatedPrice ?? 0) * item.quantity, 0)
  };
}
export function weekday(date: string, language: 'bn' | 'en'): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}
export function validNonNegativePrice(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Price must be a non-negative number');
  return parsed;
}
