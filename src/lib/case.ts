/**
 * snake_case <-> camelCase helpers.
 *
 * Supabase returns snake_case columns; the app's domain types are camelCase.
 * Each resource module maps at its boundary so pages/hooks stay unchanged.
 * For anything beyond a 1:1 rename (renamed/derived/nested fields), write an
 * explicit mapper in the module instead of relying on these.
 */

type AnyRecord = Record<string, unknown>;

const snakeToCamel = (s: string): string => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const camelToSnake = (s: string): string => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Shallow-convert a row's keys snake_case -> camelCase. */
export function rowToCamel<T = AnyRecord>(row: AnyRecord | null | undefined): T | null {
  if (!row) return null;
  const out: AnyRecord = {};
  for (const [k, v] of Object.entries(row)) out[snakeToCamel(k)] = v;
  return out as T;
}

/** Map an array of rows snake_case -> camelCase. */
export function rowsToCamel<T = AnyRecord>(rows: AnyRecord[] | null | undefined): T[] {
  return (rows ?? []).map((r) => rowToCamel<T>(r) as T);
}

/** Shallow-convert an object's keys camelCase -> snake_case (for inserts/updates). */
export function toSnake(obj: AnyRecord | null | undefined): AnyRecord {
  if (!obj) return {};
  const out: AnyRecord = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue; // skip undefined so we don't clobber columns on partial update
    out[camelToSnake(k)] = v;
  }
  return out;
}
