import type { MoneyMinor } from '../types/finance';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrCompactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatMoney(amountMinor: MoneyMinor): string {
  return inrFormatter.format(amountMinor / 100);
}

export function formatMoneyCompact(amountMinor: MoneyMinor): string {
  return inrCompactFormatter.format(amountMinor / 100);
}

export function parseMoneyToMinor(value: string): MoneyMinor | null {
  const cleaned = value.replace(/[₹,\s]/g, '');
  if (!/^\d+(?:\.\d{0,2})?$/.test(cleaned)) return null;

  const [whole, fraction = ''] = cleaned.split('.');
  const amountMinor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

  return Number.isSafeInteger(amountMinor) && amountMinor > 0 ? amountMinor : null;
}

export function parseNonNegativeMoneyToMinor(value: string): MoneyMinor | null {
  const cleaned = value.replace(/[₹,\s]/g, '');
  if (!/^\d+(?:\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  const amountMinor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amountMinor) && amountMinor >= 0 ? amountMinor : null;
}
