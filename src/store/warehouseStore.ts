import { create } from 'zustand';
import { collection, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, getLocalUserId, listen } from '../lib/firebase';
import { deviceOrigin } from '../lib/push';

let unsubItems: (() => void) | null = null;
let unsubMovements: (() => void) | null = null;

/**
 * Jednotková hodnota položky (centy) — vážený priemer nákupných cien z príjmov.
 * Staršie položky, ktoré majú zadanú len predajnú cenu, používajú tú (fallback),
 * aby ich hodnota nezmizla po prechode na nový model.
 */
export function itemUnitValueCents(item: Pick<WarehouseItem, 'purchasePriceCents' | 'salePriceCents'>): number {
  return item.purchasePriceCents > 0 ? item.purchasePriceCents : item.salePriceCents;
}

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
  addItem(data: Omit<WarehouseItem, 'id' | 'createdAt'>, origin?: string): WarehouseItem;
  updateItem(id: string, data: Partial<WarehouseItem>): void;
  deleteItem(id: string): void;
  getItemsForCompany(companyId: string): WarehouseItem[];
  addMovement(data: Omit<StockMovement, 'id'>, origin?: string): StockMovement;
  getMovementsForCompany(companyId: string): StockMovement[];
  getMovementsForItem(itemId: string): StockMovement[];
}

export const useWarehouseStore = create<WarehouseStore>((set, get) => ({
  items: [],
  movements: [],

  loadForUser: (userId) => {
    // realtime — zmeny z iného zariadenia sa prejavia okamžite
    unsubItems?.(); unsubMovements?.();

    const itemsSub = listen(query(collection(db, 'warehouse_items'), where('userId', '==', userId)), (snap) => {
      set({
        items: snap.docs
          .map((d) => { const r = d.data(); return { id: d.id, companyId: r.companyId, code: r.code, name: r.name, unit: r.unit, quantity: r.quantity, purchasePriceCents: r.purchasePriceCents, salePriceCents: r.salePriceCents, lowStockThreshold: r.lowStockThreshold, createdAt: r.createdAt }; })
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      });
    });
    unsubItems = itemsSub.unsub;

    const movSub = listen(query(collection(db, 'stock_movements'), where('userId', '==', userId)), (snap) => {
      set({
        movements: snap.docs
          .map((d) => { const r = d.data(); return { id: d.id, companyId: r.companyId, itemId: r.itemId, type: r.type, quantity: r.quantity, priceCents: r.priceCents, date: r.date, description: r.description, ref: r.ref }; })
          .sort((a, b) => b.date.localeCompare(a.date)),
      });
    });
    unsubMovements = movSub.unsub;

    return Promise.all([itemsSub.ready, movSub.ready]).then(() => {});
  },

  clearData: () => {
    unsubItems?.(); unsubItems = null;
    unsubMovements?.(); unsubMovements = null;
    set({ items: [], movements: [] });
  },

  addItem(data, origin = deviceOrigin()) {
    const userId = getLocalUserId();
    const item: WarehouseItem = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    set((s) => ({ items: [...s.items, item] }));
    setDoc(doc(db, 'warehouse_items', item.id), { userId, ...item, _origin: origin })
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

  addMovement(data, origin = deviceOrigin()) {
    const userId = getLocalUserId();
    const movement: StockMovement = { ...data, id: crypto.randomUUID() };
    // jednotková cena = spolu / množstvo
    const newUnitPriceCents = data.quantity > 0 && data.priceCents > 0
      ? Math.round(data.priceCents / data.quantity)
      : 0;

    set((s) => {
      const items = s.items.map((it) => {
        if (it.id !== data.itemId) return it;
        let qty = it.quantity;
        if (data.type === 'in')       qty += data.quantity;
        else if (data.type === 'out') qty -= data.quantity;
        else                          qty  = data.quantity;
        // Cena sa zadáva pri každom príjme — jednotková hodnota položky je
        // VÁŽENÝ PRIEMER: (stará zásoba × stará hodnota + príjem × nová cena) / nové množstvo.
        // Výdaj a úprava hodnotu jednotky nemenia.
        let purchasePriceCents = it.purchasePriceCents;
        if (data.type === 'in' && newUnitPriceCents > 0) {
          const oldQty = Math.max(0, it.quantity);
          const oldUnit = itemUnitValueCents(it);
          const newQty = oldQty + data.quantity;
          purchasePriceCents = newQty > 0
            ? Math.round((oldQty * oldUnit + data.quantity * newUnitPriceCents) / newQty)
            : newUnitPriceCents;
        }
        return { ...it, quantity: qty, purchasePriceCents };
      });
      return { items, movements: [movement, ...s.movements] };
    });
    const updatedItem = get().items.find((it) => it.id === data.itemId);
    if (updatedItem) {
      const patch: Record<string, unknown> = { quantity: updatedItem.quantity };
      if (newUnitPriceCents > 0 && data.type === 'in') patch.purchasePriceCents = updatedItem.purchasePriceCents;
      updateDoc(doc(db, 'warehouse_items', data.itemId), patch)
        .catch((e) => console.error('qty update:', e));
    }
    setDoc(doc(db, 'stock_movements', movement.id), { userId, ...movement, _origin: origin })
      .catch((e) => console.error('movement add:', e));
    return movement;
  },

  getMovementsForCompany(companyId) { return get().movements.filter((m) => m.companyId === companyId); },
  getMovementsForItem(itemId)       { return get().movements.filter((m) => m.itemId === itemId); },
}));
