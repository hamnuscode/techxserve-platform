import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AdminShell } from '@/layouts/AdminShell';
import { LoginPage, PortalLoginPage } from '@/layouts/AuthLayout';
import { PlaceholderPage } from '@/dev/PlaceholderPage';
import { SkeletonTable } from '@ds/feedback';
import { routes } from '@/config/routes';
import { navGroups } from '@/config/nav';

// Lazy-load each panel so it ships as its own chunk (brief: "lazy-loaded per panel").
const ComponentsGallery = lazy(() => import('@/dev/ComponentsGallery').then((m) => ({ default: m.ComponentsGallery })));
const DashboardPage = lazy(() => import('@panels/overview').then((m) => ({ default: m.DashboardPage })));
const ClientsListPage = lazy(() => import('@panels/clients-sales').then((m) => ({ default: m.ClientsListPage })));
const ClientDetailPage = lazy(() => import('@panels/clients-sales').then((m) => ({ default: m.ClientDetailPage })));
const InvoicesListPage = lazy(() => import('@panels/clients-sales').then((m) => ({ default: m.InvoicesListPage })));
const InvoiceFormPage = lazy(() => import('@panels/clients-sales').then((m) => ({ default: m.InvoiceFormPage })));
const InvoiceDetailPage = lazy(() => import('@panels/clients-sales').then((m) => ({ default: m.InvoiceDetailPage })));
const ContractsListPage = lazy(() => import('@panels/clients-sales').then((m) => ({ default: m.ContractsListPage })));
const QuotesListPage = lazy(() => import('@panels/clients-sales').then((m) => ({ default: m.QuotesListPage })));
const EmployeesListPage = lazy(() => import('@panels/workforce').then((m) => ({ default: m.EmployeesListPage })));
const EmployeeDetailPage = lazy(() => import('@panels/workforce').then((m) => ({ default: m.EmployeeDetailPage })));
const AttendancePage = lazy(() => import('@panels/workforce').then((m) => ({ default: m.AttendancePage })));
const PayrollPage = lazy(() => import('@panels/workforce').then((m) => ({ default: m.PayrollPage })));
const LeavesAdvancesPage = lazy(() => import('@panels/workforce').then((m) => ({ default: m.LeavesAdvancesPage })));
const BanksLedgersPage = lazy(() => import('@panels/finance').then((m) => ({ default: m.BanksLedgersPage })));
const ExpensesPage = lazy(() => import('@panels/finance').then((m) => ({ default: m.ExpensesPage })));
const CashFlowPage = lazy(() => import('@panels/finance').then((m) => ({ default: m.CashFlowPage })));
const FinancialReportsPage = lazy(() => import('@panels/finance').then((m) => ({ default: m.FinancialReportsPage })));
const ImportantDatesPage = lazy(() => import('@panels/compliance').then((m) => ({ default: m.ImportantDatesPage })));
const DocumentsPage = lazy(() => import('@panels/compliance').then((m) => ({ default: m.DocumentsPage })));
const UsersPage = lazy(() => import('@panels/admin').then((m) => ({ default: m.UsersPage })));
const SettingsPage = lazy(() => import('@panels/admin').then((m) => ({ default: m.SettingsPage })));
const TasksPage = lazy(() => import('@panels/work').then((m) => ({ default: m.TasksPage })));
const ProjectsListPage = lazy(() => import('@panels/work').then((m) => ({ default: m.ProjectsListPage })));
const ProjectDetailPage = lazy(() => import('@panels/work').then((m) => ({ default: m.ProjectDetailPage })));
const TimesheetsPage = lazy(() => import('@panels/work').then((m) => ({ default: m.TimesheetsPage })));
const ItemsStockPage = lazy(() => import('@panels/inventory').then((m) => ({ default: m.ItemsStockPage })));
const StockMovementsPage = lazy(() => import('@panels/inventory').then((m) => ({ default: m.StockMovementsPage })));
const FxRatesPage = lazy(() => import('@panels/finance').then((m) => ({ default: m.FxRatesPage })));

// Client Portal (Phase 3)
const ClientPortalLayout = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientPortalLayout })));
const ClientDashboard = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientDashboard })));
const ClientInvoices = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientInvoices })));
const ClientInvoiceDetail = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientInvoiceDetail })));
const ClientStatement = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientStatement })));
const ClientProjects = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientProjects })));
const ClientProjectDetail = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientProjectDetail })));
const ClientContracts = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientContracts })));
const ClientSupport = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientSupport })));
const ClientProfile = lazy(() => import('@/client-portal').then((m) => ({ default: m.ClientProfile })));

// Employee Portal (Phase 3)
const EmployeePortalLayout = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeePortalLayout })));
const EmployeeDashboard = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeeDashboard })));
const EmployeeAttendance = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeeAttendance })));
const EmployeeLeaves = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeeLeaves })));
const EmployeePayslips = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeePayslips })));
const EmployeeTasks = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeeTasks })));
const EmployeeTimesheets = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeeTimesheets })));
const EmployeeExpenses = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeeExpenses })));
const EmployeeDocuments = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeeDocuments })));
const EmployeeProfile = lazy(() => import('@/employee-portal').then((m) => ({ default: m.EmployeeProfile })));

/** Suspense wrapper so lazy chunks show a skeleton instead of a blank flash. */
const page = (el: ReactElement) => (
  <Suspense fallback={<div className="py-6"><SkeletonTable rows={6} /></div>}>{el}</Suspense>
);

// Real pages mapped by nav path. Anything unlisted falls back to a placeholder.
const realPages: Record<string, ReactElement> = {
  [routes.dashboard]: page(<DashboardPage />),
  [routes.clients]: page(<ClientsListPage />),
  [routes.invoices]: page(<InvoicesListPage />),
  [routes.employees]: page(<EmployeesListPage />),
  [routes.attendance]: page(<AttendancePage />),
  [routes.payroll]: page(<PayrollPage />),
  [routes.leaves]: page(<LeavesAdvancesPage />),
  [routes.banks]: page(<BanksLedgersPage />),
  [routes.expenses]: page(<ExpensesPage />),
  [routes.cashflow]: page(<CashFlowPage />),
  [routes.reports]: page(<FinancialReportsPage />),
  [routes.importantDates]: page(<ImportantDatesPage />),
  [routes.documents]: page(<DocumentsPage />),
  [routes.users]: page(<UsersPage />),
  [routes.settings]: page(<SettingsPage />),
  [routes.tasks]: page(<TasksPage />),
  [routes.contracts]: page(<ContractsListPage />),
  [routes.projects]: page(<ProjectsListPage />),
  [routes.items]: page(<ItemsStockPage />),
  [routes.stockMovements]: page(<StockMovementsPage />),
  [routes.fx]: page(<FxRatesPage />),
  [routes.quotes]: page(<QuotesListPage />),
  [routes.timesheets]: page(<TimesheetsPage />),
};

const navRoutes: RouteObject[] = navGroups.flatMap((g) =>
  g.items.map((item) => ({
    path: item.to,
    element: realPages[item.to] ?? <PlaceholderPage title={item.label} phase={item.phase} />,
  })),
);

// Non-nav detail/form routes.
const extraRoutes: RouteObject[] = [
  { path: routes.client(), element: page(<ClientDetailPage />) },
  { path: routes.invoiceNew, element: page(<InvoiceFormPage />) },
  { path: routes.invoiceEdit(), element: page(<InvoiceFormPage />) },
  { path: routes.invoice(), element: page(<InvoiceDetailPage />) },
  { path: routes.employee(), element: page(<EmployeeDetailPage />) },
  { path: routes.project(), element: page(<ProjectDetailPage />) },
];

const SsaCompaniesPage = lazy(() => import('@panels/ssa').then((m) => ({ default: m.SsaCompaniesPage })));

export const router = createBrowserRouter([
  { path: routes.login, element: <LoginPage /> },
  { path: routes.devComponents, element: page(<ComponentsGallery />) },
  { path: routes.companies, element: page(<SsaCompaniesPage />) },

  // ---- Client Portal ----
  { path: routes.cpLogin, element: <PortalLoginPage title="Client Portal" subtitle="Sign in to view your account" redirectTo={routes.cpDashboard} poweredBy /> },
  {
    path: routes.cpDashboard,
    element: page(<ClientPortalLayout />),
    children: [
      { index: true, element: page(<ClientDashboard />) },
      { path: routes.cpInvoices, element: page(<ClientInvoices />) },
      { path: routes.cpInvoice(), element: page(<ClientInvoiceDetail />) },
      { path: routes.cpStatement, element: page(<ClientStatement />) },
      { path: routes.cpProjects, element: page(<ClientProjects />) },
      { path: routes.cpProject(), element: page(<ClientProjectDetail />) },
      { path: routes.cpContracts, element: page(<ClientContracts />) },
      { path: routes.cpSupport, element: page(<ClientSupport />) },
      { path: routes.cpProfile, element: page(<ClientProfile />) },
    ],
  },

  // ---- Employee Portal ----
  { path: routes.epLogin, element: <PortalLoginPage title="Employee Portal" subtitle="Sign in to your workspace" redirectTo={routes.epDashboard} emailLabel="Email or Employee ID" /> },
  {
    path: routes.epDashboard,
    element: page(<EmployeePortalLayout />),
    children: [
      { index: true, element: page(<EmployeeDashboard />) },
      { path: routes.epAttendance, element: page(<EmployeeAttendance />) },
      { path: routes.epLeaves, element: page(<EmployeeLeaves />) },
      { path: routes.epPayslips, element: page(<EmployeePayslips />) },
      { path: routes.epTasks, element: page(<EmployeeTasks />) },
      { path: routes.epTimesheets, element: page(<EmployeeTimesheets />) },
      { path: routes.epExpenses, element: page(<EmployeeExpenses />) },
      { path: routes.epDocuments, element: page(<EmployeeDocuments />) },
      { path: routes.epProfile, element: page(<EmployeeProfile />) },
    ],
  },

  {
    path: '/',
    element: <AdminShell />,
    children: [...navRoutes, ...extraRoutes, { path: '*', element: <Navigate to={routes.dashboard} replace /> }],
  },
]);
