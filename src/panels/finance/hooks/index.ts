import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, expensesApi, type ExpenseFilters } from '@/data/mock-api';
import { qk } from '@/data/query-keys';
import type { BankAccount, Expense } from '@/types';

export function useBanks() {
  return useQuery({ queryKey: qk.banks, queryFn: financeApi.banks });
}
export function useCheques() {
  return useQuery({ queryKey: qk.cheques, queryFn: financeApi.cheques });
}
export function useReceivables() {
  return useQuery({ queryKey: qk.receivables, queryFn: financeApi.receivables });
}
export function useVendors() {
  return useQuery({ queryKey: qk.vendors, queryFn: financeApi.vendors });
}
export function useCashflow() {
  return useQuery({ queryKey: qk.cashflow, queryFn: financeApi.cashflow });
}
export function useClientProfitability() {
  return useQuery({ queryKey: ['client-profitability'], queryFn: financeApi.clientProfitability });
}
export function useChartOfAccounts() {
  return useQuery({ queryKey: ['chart-of-accounts'], queryFn: financeApi.chartOfAccounts });
}
export function usePartners() {
  return useQuery({ queryKey: ['partners'], queryFn: financeApi.partners });
}
export function useAddBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Partial<BankAccount>) => financeApi.addBank(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.banks }),
  });
}

export function useAddVendor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (name: string) => financeApi.addVendor(name), onSuccess: () => qc.invalidateQueries({ queryKey: qk.vendors }) });
}
export function useTransactions(bankId?: string) {
  return useQuery({ queryKey: qk.transactions(bankId), queryFn: () => financeApi.transactions(bankId), enabled: !!bankId });
}
export function useWireTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { fromBankId: string; toBankId: string; amount: number; reference?: string }) => financeApi.wireTransfer(v.fromBankId, v.toBankId, v.amount, v.reference),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.banks }); qc.invalidateQueries({ queryKey: ['transactions'] }); },
  });
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({ queryKey: qk.expenses(filters), queryFn: () => expensesApi.list(filters) });
}
export function useExpenseBreakdown() {
  return useQuery({ queryKey: qk.expenseBreakdown, queryFn: expensesApi.categoryBreakdown });
}
export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Partial<Expense>) => expensesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
