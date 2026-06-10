import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import type { Invoice, Payslip } from '@/types';

const BRAND: [number, number, number] = [220, 38, 38]; // red-600
const money = (n: number) => 'PKR ' + Math.round(n).toLocaleString('en-US');

interface Company {
  name?: string;
  legalAddress?: string;
  taxId?: string;
  logoUrl?: string;
}

/** Load the current company's branding (name/address/logo) for PDF headers. */
async function loadBranding(fallback: Company = {}): Promise<Company> {
  try {
    const { data } = await supabase.from('companies').select('name, legal_address, tax_id, logo_url').limit(1).maybeSingle();
    if (!data) return fallback;
    return {
      name: (data.name as string) ?? fallback.name,
      legalAddress: (data.legal_address as string) ?? fallback.legalAddress,
      taxId: (data.tax_id as string) ?? fallback.taxId,
      logoUrl: (data.logo_url as string) ?? fallback.logoUrl,
    };
  } catch {
    return fallback;
  }
}

/** Fetch an image URL and return a data URL + inferred format for jsPDF. */
async function fetchLogo(url: string): Promise<{ dataUrl: string; format: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
    const mime = dataUrl.substring(5, dataUrl.indexOf(';'));
    const format = mime.includes('png') ? 'PNG' : mime.includes('jpeg') || mime.includes('jpg') ? 'JPEG' : mime.includes('webp') ? 'WEBP' : 'PNG';
    return { dataUrl, format };
  } catch {
    return null;
  }
}

/** Shared branded header; returns the y-offset to continue from. */
async function header(doc: jsPDF, title: string, fallback: Company): Promise<number> {
  const company = await loadBranding(fallback);
  let logoOk = false;
  if (company.logoUrl) {
    const logo = await fetchLogo(company.logoUrl);
    if (logo) {
      try { doc.addImage(logo.dataUrl, logo.format, 14, 10, 24, 24); logoOk = true; } catch { logoOk = false; }
    }
  }
  doc.setFontSize(18);
  doc.setTextColor(...BRAND);
  doc.text(company.name || 'TechXServe', logoOk ? 42 : 14, 18);
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 196, 18, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const tx = logoOk ? 42 : 14;
  if (company.legalAddress) doc.text(company.legalAddress, tx, 24);
  if (company.taxId) doc.text(`Tax ID: ${company.taxId}`, tx, 29);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(14, 36, 196, 36);
  return 43;
}

export async function downloadInvoicePdf(inv: Invoice, company: Company = {}): Promise<void> {
  const doc = new jsPDF();
  let y = await header(doc, 'INVOICE', company);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice #: ${inv.number}`, 14, y);
  doc.text(`Status: ${inv.status}`, 196, y, { align: 'right' });
  y += 5;
  doc.setTextColor(100, 116, 139);
  doc.text(`Issue: ${inv.issueDate}    Due: ${inv.dueDate}`, 14, y);
  y += 8;
  doc.setTextColor(15, 23, 42);
  doc.text('Bill To:', 14, y);
  doc.setTextColor(100, 116, 139);
  doc.text(`${inv.clientName} (${inv.clientCode})`, 32, y);
  y += 4;

  autoTable(doc, {
    startY: y + 2,
    head: [['Description', 'Qty', 'Rate', 'Tax %', 'Amount']],
    body: inv.lineItems.map((li) => [li.description, String(li.quantity), money(li.rate), `${li.taxRate}%`, money(li.quantity * li.rate)]),
    headStyles: { fillColor: BRAND },
    styles: { fontSize: 9 },
  });

  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const right = 196;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const line = (label: string, val: string, yy: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, 150, yy);
    doc.text(val, right, yy, { align: 'right' });
  };
  line('Subtotal', money(inv.subtotal), endY);
  line('Tax', money(inv.tax), endY + 5);
  if (inv.withholdingTax) line('Withholding', `- ${money(inv.withholdingTax)}`, endY + 10);
  line('Total', money(inv.total), endY + 16, true);
  line('Received', money(inv.received), endY + 21);
  line('Balance Due', money(inv.total - inv.received), endY + 27, true);

  if (inv.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(`Notes: ${inv.notes}`, 14, endY + 21);
  }
  doc.save(`${inv.number}.pdf`);
}

export async function downloadPayslipPdf(p: Payslip, company: Company = {}): Promise<void> {
  const doc = new jsPDF();
  let y = await header(doc, 'PAYSLIP', company);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Employee: ${p.employeeName} (${p.employeeCode})`, 14, y);
  doc.text(`Month: ${p.month}`, 196, y, { align: 'right' });
  y += 5;
  doc.setTextColor(100, 116, 139);
  doc.text(`Present: ${p.presentDays}   Absent: ${p.absentDays}   Leave: ${p.leaveDays}   Paid Days: ${p.effectivePaidDays}`, 14, y);

  autoTable(doc, {
    startY: y + 6,
    head: [['Earnings', 'Amount']],
    body: [
      ['Base Salary', money(p.base)],
      ['Bonus', money(p.bonus)],
    ],
    headStyles: { fillColor: [22, 163, 74] },
    styles: { fontSize: 9 },
    margin: { right: 110 },
  });
  autoTable(doc, {
    startY: y + 6,
    head: [['Deductions', 'Amount']],
    body: [
      ['Deductions', money(p.deductions)],
      ...p.statutoryDeductions.map((s) => [s.label, money(s.amount)]),
      ['Advances', money(p.advances)],
    ],
    headStyles: { fillColor: BRAND },
    styles: { fontSize: 9 },
    margin: { left: 110 },
  });

  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Net Pay: ${money(p.netSalary)}`, 196, endY, { align: 'right' });
  doc.save(`payslip-${p.employeeCode}-${p.month}.pdf`);
}

export interface StatementRow { date: string; desc: string; ref: string; debit: number; credit: number; balance: number }

export async function downloadStatementPdf(clientName: string, rows: StatementRow[], company: Company = {}): Promise<void> {
  const doc = new jsPDF();
  const y = await header(doc, 'STATEMENT', company);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Client: ${clientName}`, 14, y);
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, 196, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance']],
    body: rows.map((r) => [r.date, r.desc, r.ref, r.debit ? money(r.debit) : '', r.credit ? money(r.credit) : '', money(r.balance)]),
    headStyles: { fillColor: BRAND },
    styles: { fontSize: 8 },
  });
  doc.save(`statement-${clientName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export async function downloadReportPdf(title: string, kpis: { label: string; value: string }[], company: Company = {}): Promise<void> {
  const doc = new jsPDF();
  const y = await header(doc, title.toUpperCase(), company);
  autoTable(doc, {
    startY: y + 4,
    head: [['Metric', 'Value']],
    body: kpis.map((k) => [k.label, k.value]),
    headStyles: { fillColor: BRAND },
    styles: { fontSize: 10 },
  });
  doc.save(`${title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
