/*
 * Public mock-API surface. Components/hooks import `api` from here and never
 * touch fixtures or the db directly. Swapping to real HTTP = rewriting
 * transport.ts (and optionally these resource modules' bodies).
 */
export { clientsApi } from './clients';
export { invoicesApi } from './invoices';
export { employeesApi } from './employees';
export { attendanceApi, payrollApi, leavesApi } from './workforce';
export { financeApi, expensesApi } from './finance';
export { contractsApi, projectsApi, tasksApi } from './work';
export { datesApi, documentsApi } from './compliance';
export { dashboardApi } from './dashboard';
export { usersApi, settingsApi, notificationsApi, portalApi } from './admin';
export { inventoryApi } from './inventory';
export { quotesApi } from './quotes';
export { periodsApi } from './periods';
export type { AccountingPeriod } from './periods';
export { aiApi } from './ai';
export type { ChatTurn, ChatThread } from './ai';
export { timesheetsApi } from './timesheets';
export type { TimesheetStatus, TimesheetRow, TimesheetSummary, MyTimesheet, DayHours } from './timesheets';
export { ticketsApi, claimsApi } from './portal';
export type { SupportTicket, ExpenseClaim } from './portal';
export { searchApi } from './search';
export type { SearchResult } from './search';
export { ssaApi } from './ssa';
export type { CompanyRow, CompanyAdmin } from './ssa';
export { mockConfig } from './transport';

export type { ClientFilters } from './clients';
export type { InvoiceFilters } from './invoices';
export type { EmployeeFilters } from './employees';
export type { AttendanceRow } from './workforce';
export type { ExpenseFilters, Receivable } from './finance';
export type { ContractFilters, ProjectFilters, TaskFilters } from './work';
export type { DashboardData, DashboardAlert } from './dashboard';
export type { ItemFilters, MovementFilters } from './inventory';
export type { QuoteFilters } from './quotes';
