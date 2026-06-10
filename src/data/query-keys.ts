/** Centralized TanStack Query keys — stable, serializable, hierarchical. */
export const qk = {
  dashboard: ['dashboard'] as const,

  clients: (filters?: unknown) => ['clients', filters] as const,
  client: (id: string) => ['client', id] as const,
  clientContracts: (id: string) => ['client', id, 'contracts'] as const,
  clientInvoices: (id: string) => ['client', id, 'invoices'] as const,

  invoices: (filters?: unknown) => ['invoices', filters] as const,
  invoice: (id: string) => ['invoice', id] as const,

  quotes: (filters?: unknown) => ['quotes', filters] as const,

  contracts: (filters?: unknown) => ['contracts', filters] as const,
  projects: (filters?: unknown) => ['projects', filters] as const,
  project: (id: string) => ['project', id] as const,
  tasks: (filters?: unknown) => ['tasks', filters] as const,
  task: (id: string) => ['task', id] as const,

  employees: (filters?: unknown) => ['employees', filters] as const,
  employee: (id: string) => ['employee', id] as const,
  attendanceToday: (filters?: unknown) => ['attendance', 'today', filters] as const,
  payroll: (filters?: unknown) => ['payroll', filters] as const,
  leaves: ['leaves'] as const,
  advances: ['advances'] as const,

  banks: ['banks'] as const,
  cheques: ['cheques'] as const,
  transactions: (bankId?: string) => ['transactions', bankId] as const,
  vendors: ['vendors'] as const,
  receivables: ['receivables'] as const,
  cashflow: ['cashflow'] as const,
  fx: ['fx'] as const,
  expenses: (filters?: unknown) => ['expenses', filters] as const,
  expenseBreakdown: ['expenses', 'breakdown'] as const,

  importantDates: (filters?: unknown) => ['dates', filters] as const,
  docFolders: ['doc-folders'] as const,
  docFiles: (folderId: string) => ['doc-files', folderId] as const,

  items: (filters?: unknown) => ['items', filters] as const,
  movements: (filters?: unknown) => ['movements', filters] as const,

  users: (search?: string) => ['users', search] as const,
  company: ['company'] as const,
  branches: ['branches'] as const,
  departments: ['departments'] as const,
  notifications: ['notifications'] as const,
  periods: ['accounting-periods'] as const,
};
