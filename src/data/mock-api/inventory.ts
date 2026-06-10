import type { Item, Paged, StockMovement } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel, toSnake } from '@/lib/case';
import type { ListParams } from './transport';

export interface ItemFilters extends ListParams {
  category?: string;
  location?: string;
  stockStatus?: 'In Stock' | 'Low' | 'Out' | '';
}

export interface MovementFilters extends ListParams {
  type?: string;
  location?: string;
}

export const inventoryApi = {
  async items(params: ItemFilters = {}): Promise<Paged<Item>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    let q = supabase.from('inventory_items').select('*', { count: 'exact' });
    if (params.search) q = q.or(`sku.ilike.%${params.search}%,name.ilike.%${params.search}%,category.ilike.%${params.search}%`);
    if (params.category) q = q.eq('category', params.category);
    // Stock status compares stock vs reorder_level — done via filters where possible.
    if (params.stockStatus === 'Out') q = q.eq('stock', 0);
    else if (params.stockStatus === 'In Stock') q = q.gt('stock', 0);

    const sortMap: Record<string, string> = { sku: 'sku', name: 'name', stock: 'stock' };
    const dbSort = sortMap[params.sortKey ?? ''] ?? 'name';
    q = q.order(dbSort, { ascending: params.sortDir !== 'desc' }).range(from, from + pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    let rows = rowsToCamel<Item>(data);
    // "Low" (0 < stock <= reorder) and location filters need row-level checks.
    if (params.stockStatus === 'Low') rows = rows.filter((i) => i.stock > 0 && i.stock <= i.reorderLevel);
    if (params.location) rows = rows.filter((i) => i.locations.some((l) => l.location === params.location));
    return { rows, total: count ?? 0, page, pageSize };
  },

  async addItem(data: Partial<Item>): Promise<Item> {
    const { id: _i, ...rest } = data;
    const { data: row, error } = await supabase.from('inventory_items').insert(toSnake(rest)).select().single();
    if (error) throw error;
    return rowToCamel<Item>(row)!;
  },

  async movements(params: MovementFilters = {}): Promise<Paged<StockMovement>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    // Join item labels via embed for sku/name.
    let q = supabase
      .from('stock_movements')
      .select('*, item:inventory_items(sku, name)', { count: 'exact' });
    if (params.type) q = q.eq('type', params.type);

    const sortMap: Record<string, string> = { date: 'date', quantity: 'quantity' };
    const dbSort = sortMap[params.sortKey ?? ''] ?? 'date';
    q = q.order(dbSort, { ascending: params.sortDir !== 'desc' }).range(from, from + pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    let rows: StockMovement[] = (data ?? []).map((m) => {
      const item = (m as { item?: { sku?: string; name?: string } }).item;
      return {
        ...rowToCamel<StockMovement>(m)!,
        sku: item?.sku ?? '',
        itemName: item?.name ?? '',
      };
    });
    if (params.search) {
      const s = params.search.toLowerCase();
      rows = rows.filter((m) => [m.sku, m.itemName, m.reference].some((f) => f?.toLowerCase().includes(s)));
    }
    if (params.location) rows = rows.filter((m) => m.fromLocation === params.location || m.toLocation === params.location);
    return { rows, total: count ?? 0, page, pageSize };
  },

  async addMovement(data: Partial<StockMovement>): Promise<StockMovement> {
    const insert = {
      date: data.date,
      type: data.type ?? 'In',
      item_id: data.itemId,
      quantity: data.quantity ?? 0,
      from_location: data.fromLocation ?? null,
      to_location: data.toLocation ?? null,
      reference: data.reference ?? null,
      user: data.user ?? null,
    };
    // DB trigger adjusts inventory_items.stock automatically.
    const { data: row, error } = await supabase
      .from('stock_movements')
      .insert(insert)
      .select('*, item:inventory_items(sku, name)')
      .single();
    if (error) throw error;
    const item = (row as { item?: { sku?: string; name?: string } }).item;
    return { ...rowToCamel<StockMovement>(row)!, sku: item?.sku ?? '', itemName: item?.name ?? '' };
  },
};
