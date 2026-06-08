import { create } from 'zustand';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, getLocalUserId } from '../lib/firebase';

export interface WarehouseItem {
  id: string; companyId: string; code: string; name: string; unit: string;
  quantity: number; purchasePriceCents: number; salePriceCents: number;
  lowStockThreshold: number; createdAt: string;
}

export type MovementType = 'in' | 'out' | 'adjustment';

export interface StockMovement {
  id: string; companyId: string; itemId: string; type: MovementType;
  quantity: number; priceCents: number; date: string; description: string; ref?: string;
}

interface WarehouseStore {
  items: WarehouseItem[];
  movements: StockMovement[];
  loadForUser: (userId: string) => Promise<void>;
  clearData: () => void;
  addItem(data: Omit<WarehouseItem, 'id' | 'createdAt'>): WarehouseItem;
  updateItem(id: string, data: Partial<WarehouseItem>): void;
  deleteItem(id: string): void;
  getItemsForCompany(companyId: string): WarehouseItem[];
  addMovement(data: Omit<StockMovement, 'id'>): StockMovement;
  getMovementsForCompany(companyId: string): StockMovement[];
  getMovementsForItem(itemId: string): StockMovement[];
}

export const useWarehouseStore = create<WarehouseStore>((set, get) => ({
  items: [],
  movements: [],

  loadForUser: async (userId) => {
      const [itemsSnap, movSnap] = await Promise.all([
        getDocs(query(collection(db, 'warehouse_items'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'stock_movements'), where('userId', '==', userId))),
      ]);
      set({
        items: itemsSnap.docs
          .map((d) => { const r = d.data(); return { id: d.id, companyId: r.companyId, code: r.code, name: r.name, unit: r.unit, quantity: r.quantity, purchasePriceCents: r.purchasePriceCents, salePriceCents: r.salePriceCents, lowStockThreshold: r.lowStockThreshold, createdAt: r.createdAt }; })
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        movements: movSnap.docs
          .map((d) => { const r = d.data(); return { id: d.id, companyId: r.companyId, itemId: r.itemId, type: r.type, quantity: r.quantity, priceCents: r.priceCents, date: r.date, description: r.description, ref: r.ref }; })
          .sort((a, b) => b.date.localeCompare(a.date)),
      });
  },

  clearData: () => set({ items: [], movements: [] }),

  addItem(data) {
    const userId = getLocalUserId();
    const item: WarehouseItem = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    set((s) => ({ items: [...s.items, item] }));
    setDoc(doc(db, 'warehouse_items', item.id), { userId, ...item })
      .catch((e) => console.error('wh item add:', e));
    return item;
  },

  updateItem(id, data) {
    set((s) => ({ items: s.items.map((it) => it.id === id ? { ...it, ...data } : it) }));
    updateDoc(doc(db, 'warehouse_items', id), data as Record<string, unknown>)
      .catch((e) => console.error('wh item update:', e));
  },

  deleteItem(id) {
    set((s) => ({ items: s.items.filter((it) => it.id !== id), movements: s.movements.filter((m) => m.itemId !== id) }));
    deleteDoc(doc(db, 'warehouse_items', id)).catch((e) => console.error('wh item del:', e));
  },

  getItemsForCompany(companyId) { return get().items.filter((it) => it.companyId === companyId); },

  addMovement(data) {
    const userId = getLocalUserId();
    const movement: StockMovement = { ...data, id: crypto.randomUUID() };
    set((s) => {
      const items = s.items.map((it) => {
        if (it.id !== data.itemId) return it;
        let qty = it.quantity;
        if (data.type === 'in')       qty += data.quantity;
        else if (data.type === 'out') qty -= data.quantity;
        else                          qty  = data.quantity;
        return { ...it, quantity: qty };
      });
      return { items, movements: [movement, ...s.movements] };
    });
    const updatedQty = get().items.find((it) => it.id === data.itemId)?.quantity;
    if (updatedQty !== undefined)
      updateDoc(doc(db, 'warehouse_items', data.itemId), { quantity: updatedQty })
        .catch((e) => console.error('qty update:', e));
    setDoc(doc(db, 'stock_movements', movement.id), { userId, ...movement })
      .catch((e) => console.error('movement add:', e));
    return movement;
  },

  getMovementsForCompany(companyId) { return get().movements.filter((m) => m.companyId === companyId); },
  getMovementsForItem(itemId)       { return get().movements.filter((m) => m.itemId === itemId); },
}));
