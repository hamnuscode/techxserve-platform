import { supabase } from '@/lib/supabase';

export interface AccountingPeriod {
  month: string; // yyyy-mm
  closedAt: string;
  note?: string;
}

/** Normalise a yyyy-mm (or full date) to the first-of-month date string. */
function monthStart(month: string): string {
  return `${month.slice(0, 7)}-01`;
}

export const periodsApi = {
  /** All closed months for the company, most recent first. */
  async list(): Promise<AccountingPeriod[]> {
    const { data, error } = await supabase
      .from('accounting_periods')
      .select('period_month, closed_at, note')
      .order('period_month', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p) => ({
      month: (p.period_month as string).slice(0, 7),
      closedAt: p.closed_at as string,
      note: (p.note as string) ?? undefined,
    }));
  },

  async close(month: string, note?: string): Promise<void> {
    const { error } = await supabase
      .from('accounting_periods')
      .insert({ period_month: monthStart(month), note: note ?? null });
    if (error) throw error;
  },

  async reopen(month: string): Promise<void> {
    const { error } = await supabase
      .from('accounting_periods')
      .delete()
      .eq('period_month', monthStart(month));
    if (error) throw error;
  },
};
