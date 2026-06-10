import { useMemo } from 'react';
import { TrendingUp, Wallet, CreditCard, Scale, Download } from 'lucide-react';
import { PageHeader, KpiStrip, useFormatMoney } from '@/shared';
import { Button, Card, CardTitle } from '@ds/primitives';
import { LineChart, BarChart } from '@ds/charts';
import { chartRoles } from '@ds/tokens';
import { KPICard } from '@ds/data-display';
import { toast } from '@ds/feedback';
import { downloadReportPdf } from '@/lib/pdf';
import { company } from '@/data/fixtures';
import { useCashflow } from '../hooks';

const pkr = (n: number) => 'PKR ' + Math.round(n).toLocaleString('en-US');

export function CashFlowPage() {
  const money = useFormatMoney();
  const { data: cashflow = [], isLoading } = useCashflow();

  const totals = useMemo(() => {
    const revenue = cashflow.reduce((s, m) => s + m.revenue, 0);
    const payroll = cashflow.reduce((s, m) => s + m.payroll, 0);
    const expenses = cashflow.reduce((s, m) => s + m.expenses, 0);
    return { revenue, payroll, expenses, net: revenue - payroll - expenses };
  }, [cashflow]);

  const payrollImpact = cashflow.map((m) => ({ month: m.month, Impact: Math.round((m.payroll / Math.max(m.revenue, 1)) * 100) }));

  return (
    <div>
      <PageHeader
        title="Cash Flow"
        description="Revenue, expenses and payroll over the last 12 months."
        actions={<Button icon={Download} onClick={() => {
          downloadReportPdf('Cash Flow Report', [
            { label: 'Revenue (12 mo)', value: pkr(totals.revenue) },
            { label: 'Total Payroll', value: pkr(totals.payroll) },
            { label: 'Total Expenses', value: pkr(totals.expenses) },
            { label: 'Net', value: pkr(totals.net) },
          ], company);
          toast.success('Cash flow report PDF generated');
        }}>Download Report</Button>}
      />

      <KpiStrip cols={4}>
        <KPICard label="Revenue" value={totals.revenue} format={(n) => money(n, { compact: true })} icon={TrendingUp} tone="success" loading={isLoading} />
        <KPICard label="Total Payroll" value={totals.payroll} format={(n) => money(n, { compact: true })} icon={Wallet} tone="info" loading={isLoading} />
        <KPICard label="Total Expenses" value={totals.expenses} format={(n) => money(n, { compact: true })} icon={CreditCard} tone="warning" loading={isLoading} />
        <KPICard label="Net" value={totals.net} format={(n) => money(n, { compact: true })} icon={Scale} tone="brand" loading={isLoading} />
      </KpiStrip>

      <div className="space-y-6">
        <Card>
          <CardTitle className="mb-4">Monthly Cash Flow</CardTitle>
          <LineChart
            xKey="month"
            data={cashflow as unknown as Array<Record<string, string | number>>}
            height={300}
            valueFormatter={(v) => money(v, { compact: true })}
            series={[
              { key: 'revenue', name: 'Revenue', color: chartRoles.revenue },
              { key: 'expenses', name: 'Expenses', color: chartRoles.expenses },
              { key: 'payroll', name: 'Payroll', color: chartRoles.payroll },
            ]}
          />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle className="mb-4">Revenue vs Expenses</CardTitle>
            <BarChart
              xKey="month"
              data={cashflow as unknown as Array<Record<string, string | number>>}
              height={260}
              valueFormatter={(v) => money(v, { compact: true })}
              series={[
                { key: 'revenue', name: 'Revenue', color: chartRoles.revenue },
                { key: 'expenses', name: 'Expenses', color: chartRoles.expenses },
              ]}
            />
          </Card>
          <Card>
            <CardTitle className="mb-4">Payroll Impact (% of revenue)</CardTitle>
            <BarChart
              xKey="month"
              data={payrollImpact}
              height={260}
              showLegend={false}
              valueFormatter={(v) => `${v}%`}
              series={[{ key: 'Impact', name: 'Payroll %', color: chartRoles.payroll }]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
