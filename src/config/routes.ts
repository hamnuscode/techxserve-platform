/** Typed route constants — the single source of truth for paths. */
export const routes = {
  login: '/login',
  devComponents: '/dev/components',

  companies: '/companies',
  dashboard: '/',

  clients: '/clients',
  client: (id = ':id') => `/clients/${id}`,
  contracts: '/contracts',
  quotes: '/quotes',
  invoices: '/invoices',
  invoiceNew: '/invoices/new',
  invoice: (id = ':id') => `/invoices/${id}`,
  invoiceEdit: (id = ':id') => `/invoices/${id}/edit`,

  projects: '/projects',
  project: (id = ':id') => `/projects/${id}`,
  tasks: '/tasks',
  timesheets: '/timesheets',

  employees: '/workforce/employees',
  employee: (id = ':id') => `/workforce/employees/${id}`,
  attendance: '/workforce/attendance',
  payroll: '/workforce/payroll',
  leaves: '/workforce/leaves',

  items: '/inventory/items',
  stockMovements: '/inventory/movements',

  banks: '/finance/banks',
  expenses: '/finance/expenses',
  cashflow: '/finance/cashflow',
  reports: '/finance/reports',
  fx: '/finance/fx',

  importantDates: '/compliance/dates',
  documents: '/compliance/documents',

  users: '/admin/users',
  settings: '/admin/settings',

  // ---- Client Portal (Phase 3) ----
  cpLogin: '/portal/login',
  cpDashboard: '/portal',
  cpInvoices: '/portal/invoices',
  cpInvoice: (id = ':id') => `/portal/invoices/${id}`,
  cpStatement: '/portal/statement',
  cpProjects: '/portal/projects',
  cpProject: (id = ':id') => `/portal/projects/${id}`,
  cpContracts: '/portal/contracts',
  cpSupport: '/portal/support',
  cpProfile: '/portal/profile',

  // ---- Employee Portal (Phase 3) ----
  epLogin: '/me/login',
  epDashboard: '/me',
  epAttendance: '/me/attendance',
  epLeaves: '/me/leaves',
  epPayslips: '/me/payslips',
  epTasks: '/me/tasks',
  epTimesheets: '/me/timesheets',
  epExpenses: '/me/expenses',
  epDocuments: '/me/documents',
  epProfile: '/me/profile',
} as const;
