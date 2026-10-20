export type PurchaseStatus = 'pending' | 'purchased' | 'skipped';
export type Language = 'bn' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export interface ShoppingItem {
  id: string; listId: string; name: string; quantity: number; unit: string;
  estimatedPrice?: number; actualPrice?: number; status: PurchaseStatus; sortOrder: number;
  notes?: string; createdAt: string; updatedAt: string;
}
export interface ShoppingList {
  id: string; title: string; shoppingDate: string; notes?: string; category?: string;
  completedAt?: string; createdAt: string; updatedAt: string;
}
export interface SavedProduct {
  id: string; name: string; defaultUnit?: string; defaultEstimatedPrice?: number; category?: string;
  createdAt: string; updatedAt: string;
}
export interface AppSettings { language: Language; theme: Theme; currency: string; useBengaliDigits: boolean }
export interface ListSummary { total: number; purchased: number; pending: number; skipped: number; progress: number; actualSpend: number; unpricedPurchased: number; estimatedSpend: number }
