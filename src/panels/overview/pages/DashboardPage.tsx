import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, CreditCard, Wallet, Settings2, RotateCw } from 'lucide-react';
import { PageHeader, KpiStrip, useFormatMoney } from '@/shared';
import { KPICard } from '@ds/data-display';
import { Card, CardHeader, CardTitle } from '@ds/primitives';
import { BarChart, LineChart, type BarSeries } from '@ds/charts';
import { DropdownMenu } from '@ds/overlays';
import { ErrorState } from '@ds/feedback';
import { IconButton } from '@ds/primitives';
import { chartRoles } from '@ds/tokens';
import { useDashboard } from '../hooks/useDashboard';
import { AlertBanner } from '../components/AlertBanner';
import { BankOverview } from '../components/BankOverview';
import { ActivityFeed } from '../components/ActivityFeed';
import { useAuthStore } from '@/app/stores/auth';
import { useDashboardWidgets } from '@/panels/admin/hooks';
import { routes } from '@/config/routes';

function ChartCard({
  title,
  children,
  onRefresh,
}: {
  title: string;
  children: React.ReactNode;
  onRefresh?: () => void;
}) {
  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-1">
          {onRefresh && <IconButton icon={RotateCw} label="Refresh" size="sm" onClick={onRefresh} />}
          <DropdownMenu
            trigger={<IconButton icon={Settings2} label="Customise" size="sm" />}
            items={[
              { label: 'Change range', icon: Settings2 },
              { label: 'Change top N' },
              { label: 'Export PNG' },
            ]}
          />
        </div>
      </CardHeader>
      {children}
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const money = useFormatMoney();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useDashboard();
  const { data: hiddenWidgets = [] } = useDashboardWidgets();
  const show = (key: string) => !hiddenWidgets.includes(key);

  const k = data?.kpis;
  const noData = !isLoading && !data;

  // Derive revenue series from the data keys (client first names).
  const revenueKeys = data?.revenueByClient?.[0]
    ? Object.keys(data.revenueByClient[0]).filter((key) => key !== 'month')
    : [];
  const revenueSeries: BarSeries[] = revenueKeys.map((key) => ({ key, name: key }));

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Here's what's happening across your business today."
      />

      {data && <AlertBanner alerts={data.alerts} />}

      {/* KPI cards (A3 §B) */}
      <KpiStrip cols={4}>
        {show('employees') && (
        <KPICard
          label="Total Employees"
          value={k?.totalEmployees ?? 0}
          format={(n) => String(Math.round(n))}
          icon={Users}
          tone="brand"
          loading={isLoading}
          empty={k?.totalEmployees === 0}
          delta={k ? { value: `+${k.employeeDelta} this month`, direction: 'up' } : undefined}
          onClick={() => navigate(routes.employees)}
        />
        )}
        {show('attendance') && (
        <KPICard
          label="Attendance Today"
          value={k?.attendanceToday ?? 0}
          format={(n) => `${Math.round(n)}%`}
          icon={CalendarCheck}
          tone="success"
          loading={isLoading}
          delta={k ? { value: `${k.attendanceDelta}% vs yesterday`, direction: 'up' } : undefined}
          onClick={() => navigate(routes.attendance)}
        />
        )}
        {show('expenses') && (
        <KPICard
          label="Total Expenses MTD"
          value={k?.expensesMtd ?? 0}
          format={(n) => money(n, { compact: true })}
          icon={CreditCard}
          tone="warning"
          loading={isLoading}
          delta={k ? { value: `${Math.abs(k.expensesDelta)}% vs last MTD`, direction: k.expensesDelta < 0 ? 'down' : 'up', positive: k.expensesDelta < 0 } : undefined}
          onClick={() => navigate(routes.expenses)}
        />
        )}
        {show('payroll') && (
        <KPICard
          label="Payroll MTD"
          value={k?.payrollMtd ?? 0}
          format={(n) => money(n, { compact: true })}
          icon={Wallet}
          tone="info"
          loading={isLoading}
          delta={k ? { value: k.payrollStatus, direction: 'up', positive: k.payrollStatus === 'Processed' } : undefined}
          onClick={() => navigate(routes.payroll)}
        />
        )}
      </KpiStrip>

      {isError || noData ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: banks */}
          {show('banks') && (
          <div className="lg:col-span-1">
            {data && <BankOverview banks={data.banks} totalCash={data.totalCash} />}
          </div>
          )}

          {/* Right: revenue chart */}
          {show('revenue') && (
          <div className="lg:col-span-2">
            <ChartCard title="Revenue by Client" onRefresh={() => refetch()}>
              {data && (
                <BarChart
                  xKey="month"
                  data={data.revenueByClient}
                  series={revenueSeries}
                  height={300}
                  valueFormatter={(v) => money(v, { compact: true })}
                />
              )}
            </ChartCard>
          </div>
          )}

          {/* Bottom-left: attendance trend */}
          {show('attendanceTrend') && (
          <div className="lg:col-span-2">
            <ChartCard title="Attendance Trend (7 days)">
              {data && (
                <LineChart
                  xKey="day"
                  data={data.attendanceTrend}
                  height={260}
                  series={[
                    { key: 'Present', name: 'Present', color: chartRoles.present },
                    { key: 'Absent', name: 'Absent', color: chartRoles.absent },
                    { key: 'Leave', name: 'Leave', color: chartRoles.leave },
                  ]}
                />
              )}
            </ChartCard>
          </div>
          )}

          {/* Bottom-right: activity */}
          {show('activity') && (
          <div className="lg:col-span-1">
            {data && <ActivityFeed events={data.activity} />}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
