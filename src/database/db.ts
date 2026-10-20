import Dexie, { type EntityTable } from 'dexie';
import type { ShoppingItem, ShoppingList, SavedProduct } from '../types';

class IshtiraDatabase extends Dexie {
  lists!: EntityTable<ShoppingList, 'id'>;
  items!: EntityTable<ShoppingItem, 'id'>;
  products!: EntityTable<SavedProduct, 'id'>;
  constructor() {
    super('ishtira-local');
    this.version(1).stores({
      lists: 'id, shoppingDate, updatedAt, completedAt',
      items: 'id, listId, status, sortOrder, name',
      products: 'id, name, category'
    });
  }
}
export const db = new IshtiraDatabase();
export async function deleteListWithItems(listId: string) {
  await db.transaction('rw', db.lists, db.items, async () => {
    await db.items.where('listId').equals(listId).delete();
    await db.lists.delete(listId);
  });
}
