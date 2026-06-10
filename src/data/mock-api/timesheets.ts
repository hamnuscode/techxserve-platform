import { supabase } from '@/lib/supabase';

export type TimesheetStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
export interface DayHours { mon?: number; tue?: number; wed?: number; thu?: number; fri?: number; sat?: number; sun?: number }
export interface TimesheetRow {
  id?: string;
  label: string;
  projectId?: string | null;
  hours: DayHours;
}
export interface TimesheetSummary {
  id: string;
  employeeName: string;
  weekStart: string;
  status: TimesheetStatus;
  totalHours: number;
  rejectionNote?: string;
}
export interface MyTimesheet {
  id: string;
  weekStart: string;
  status: TimesheetStatus;
  rejectionNote?: string;
  rows: TimesheetRow[];
}

export const timesheetsApi = {
  /** Admin: every timesheet with employee + total hours. */
  async adminList(status?: string): Promise<TimesheetSummary[]> {
    let q = supabase.from('timesheet_list').select('*').order('week_start', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((t) => ({
      id: t.id as string,
      employeeName: (t.employee_name as string) ?? '',
      weekStart: t.week_start as string,
      status: t.status as TimesheetStatus,
      totalHours: Number(t.total_hours ?? 0),
      rejectionNote: (t.rejection_note as string) ?? undefined,
    }));
  },

  async setStatus(id: string, status: TimesheetStatus, note?: string): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (status === 'Approved') patch.approved_at = new Date().toISOString();
    if (status === 'Submitted') patch.submitted_at = new Date().toISOString();
    if (status === 'Rejected') patch.rejection_note = note ?? null;
    const { error } = await supabase.from('timesheets').update(patch).eq('id', id);
    if (error) throw error;
  },

  /** Employee: the current user's timesheet for a week, created on first access. */
  async mine(employeeId: string, weekStart: string): Promise<MyTimesheet> {
    let { data: sheet } = await supabase
      .from('timesheets')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (!sheet) {
      const { data, error } = await supabase
        .from('timesheets')
        .insert({ employee_id: employeeId, week_start: weekStart, status: 'Draft' })
        .select('*')
        .single();
      if (error) throw error;
      sheet = data;
    }

    const { data: rows, error: rErr } = await supabase
      .from('timesheet_rows')
      .select('*')
      .eq('timesheet_id', sheet.id);
    if (rErr) throw rErr;

    return {
      id: sheet.id as string,
      weekStart: sheet.week_start as string,
      status: sheet.status as TimesheetStatus,
      rejectionNote: (sheet.rejection_note as string) ?? undefined,
      rows: (rows ?? []).map((r) => ({ id: r.id as string, label: (r.label as string) ?? '', projectId: (r.project_id as string) ?? null, hours: (r.hours as DayHours) ?? {} })),
    };
  },

  /** Replace all rows for a timesheet (draft autosave). */
  async saveRows(timesheetId: string, rows: TimesheetRow[]): Promise<void> {
    await supabase.from('timesheet_rows').delete().eq('timesheet_id', timesheetId);
    const payload = rows.filter((r) => r.label.trim()).map((r) => ({
      timesheet_id: timesheetId,
      label: r.label,
      project_id: r.projectId ?? null,
      hours: r.hours,
    }));
    if (payload.length) {
      const { error } = await supabase.from('timesheet_rows').insert(payload);
      if (error) throw error;
    }
  },

  async submit(timesheetId: string, rows: TimesheetRow[]): Promise<void> {
    await timesheetsApi.saveRows(timesheetId, rows);
    await timesheetsApi.setStatus(timesheetId, 'Submitted');
  },
};
