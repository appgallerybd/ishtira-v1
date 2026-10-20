import { describe, expect, it } from 'vitest';
import { cycleStatus, sortItems, summarizeItems, validNonNegativePrice, weekday } from '../src/utils/shopping';
import type { ShoppingItem } from '../src/types';

const item = (id: string, status: ShoppingItem['status'], price?: number, estimatedPrice?: number): ShoppingItem => ({
  id, listId: 'list', name: id, quantity: 1, unit: 'piece', status, sortOrder: 0,
  actualPrice: price, estimatedPrice, createdAt: '', updatedAt: ''
});
describe('shopping rules', () => {
  it('cycles statuses pending -> purchased -> skipped -> pending', () => {
    expect(cycleStatus('pending')).toBe('purchased');
    expect(cycleStatus('purchased')).toBe('skipped');
    expect(cycleStatus('skipped')).toBe('pending');
  });
  it('calculates progress from item count and actual spending from priced purchases only', () => {
    const summary = summarizeItems([item('a','purchased',30,40),item('b','pending',99,10),item('c','skipped',50,20),item('d','purchased',undefined,5)]);
    expect(summary.progress).toBe(50);
    expect(summary.actualSpend).toBe(30);
    expect(summary.unpricedPurchased).toBe(1);
    expect(summary.pending + summary.purchased + summary.skipped).toBe(summary.total);
  });
  it('sorts pending before purchased before skipped and keeps manual order', () => {
    const result = sortItems([{...item('skip','skipped'),sortOrder:0},{...item('p2','pending'),sortOrder:2},{...item('p1','pending'),sortOrder:1},{...item('done','purchased'),sortOrder:0}]);
    expect(result.map(i=>i.id)).toEqual(['p1','p2','done','skip']);
  });
  it('calculates weekday from local calendar date without UTC drift', () => {
    expect(weekday('2026-10-20','en')).toBe('Tuesday');
  });
  it('validates prices', () => {
    expect(validNonNegativePrice('0')).toBe(0);
    expect(validNonNegativePrice('12.5')).toBe(12.5);
    expect(() => validNonNegativePrice('-1')).toThrow();
    expect(() => validNonNegativePrice('abc')).toThrow();
    expect(validNonNegativePrice('')).toBeUndefined();
  });
  it('returns zero progress for an empty list', () => {
    expect(summarizeItems([]).progress).toBe(0);
  });
});
