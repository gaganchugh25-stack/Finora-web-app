import { addTransaction } from './finance';
import { parseMoneyToMinor } from './money';
import type { FinanceState, NewTransactionInput, Transaction, TransactionType } from '../types/finance';

export interface ImportPreviewRow {
  rowNumber: number;
  raw: string[];
  input: NewTransactionInput | null;
  errors: string[];
}

const expectedHeaders = ['type', 'date', 'amount', 'account', 'to account', 'payee', 'category', 'note'];

function normalise(value: string): string {
  return value.trim().toLocaleLowerCase('en-IN');
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function buildImportPreview(text: string, state: FinanceState): ImportPreviewRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map(normalise);
  const missingHeaders = expectedHeaders.slice(0, 7).filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    return [{ rowNumber: 1, raw: rows[0], input: null, errors: [`Missing columns: ${missingHeaders.join(', ')}`] }];
  }

  const valueAt = (row: string[], header: string) => row[headers.indexOf(header)]?.trim() ?? '';
  const accounts = new Map(state.accounts.filter((account) => !account.archived).flatMap((account) => [
    [normalise(account.id), account.id],
    [normalise(account.name), account.id],
  ]));

  return rows.slice(1).map((row, index) => {
    const errors: string[] = [];
    const typeValue = normalise(valueAt(row, 'type'));
    const type = (['income', 'expense', 'transfer'].includes(typeValue) ? typeValue : null) as TransactionType | null;
    const occurredOn = valueAt(row, 'date');
    const amountMinor = parseMoneyToMinor(valueAt(row, 'amount'));
    const accountId = accounts.get(normalise(valueAt(row, 'account')));
    const toAccountRaw = valueAt(row, 'to account');
    const toAccountId = toAccountRaw ? accounts.get(normalise(toAccountRaw)) : undefined;
    const payee = valueAt(row, 'payee');
    const category = valueAt(row, 'category');

    if (!type) errors.push('Type must be income, expense or transfer.');
    if (!isValidIsoDate(occurredOn)) errors.push('Use a valid date in YYYY-MM-DD format.');
    if (!amountMinor) errors.push('Amount must be greater than ₹0 with up to two decimals.');
    if (!accountId) errors.push('Account does not match an existing account name or ID.');
    if (type === 'transfer' && !toAccountId) errors.push('A valid To Account is required for transfers.');
    if (type === 'transfer' && toAccountId === accountId) errors.push('Transfer accounts must be different.');
    if (!payee) errors.push('Payee is required.');
    if (!category) errors.push('Category is required.');

    const input: NewTransactionInput | null = type && amountMinor && accountId && errors.length === 0 ? {
      type,
      amountMinor,
      occurredOn,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      payee,
      category: type === 'transfer' ? 'Transfer' : category,
      note: valueAt(row, 'note') || undefined,
    } : null;

    return { rowNumber: index + 2, raw: row, input, errors };
  });
}

export function importPreviewRows(state: FinanceState, rows: ImportPreviewRow[]): FinanceState {
  return rows.reduce((current, row) => row.input ? addTransaction(current, row.input) : current, state);
}

function safeCsvCell(value: string): string {
  const protectedValue = /^[=+@-]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

export function transactionsToCsv(transactions: Transaction[], state: FinanceState): string {
  const accountNames = new Map(state.accounts.map((account) => [account.id, account.name]));
  const header = ['Type', 'Date', 'Amount', 'Account', 'To Account', 'Payee', 'Category', 'Note'];
  const lines = transactions.map((transaction) => [
    transaction.type,
    transaction.occurredOn,
    (transaction.amountMinor / 100).toFixed(2),
    accountNames.get(transaction.accountId) ?? transaction.accountId,
    transaction.toAccountId ? accountNames.get(transaction.toAccountId) ?? transaction.toAccountId : '',
    transaction.payee,
    transaction.category,
    transaction.note ?? '',
  ].map(safeCsvCell).join(','));
  return [header.map(safeCsvCell).join(','), ...lines].join('\r\n');
}
