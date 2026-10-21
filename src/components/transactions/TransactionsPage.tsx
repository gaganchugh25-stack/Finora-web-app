import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Check, ChevronLeft, ChevronRight, FileText, FilterX, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { formatDate } from '../../lib/date';
import { formatMoney, parseMoneyToMinor } from '../../lib/money';
import type { FinanceState, Transaction, TransactionType } from '../../types/finance';

interface TransactionsPageProps {
  state: FinanceState;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactions: Transaction[]) => void;
  onImport: () => void;
  onExportCsv: (transactions: Transaction[]) => void;
  onPrint: () => void;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';
const pageSize = 10;

export function TransactionsPage({ state, searchQuery, onSearchChange, onAdd, onEdit, onDelete, onImport, onExportCsv, onPrint }: TransactionsPageProps) {
  const [type, setType] = useState<'all' | TransactionType>('all');
  const [accountId, setAccountId] = useState('all');
  const [category, setCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const accountNames = useMemo(() => new Map(state.accounts.map((account) => [account.id, account.name])), [state.accounts]);
  const categories = useMemo(() => [...new Set(state.transactions.map((transaction) => transaction.category))].sort(), [state.transactions]);
  const minimumMinor = minimum ? parseMoneyToMinor(minimum) : null;
  const maximumMinor = maximum ? parseMoneyToMinor(maximum) : null;
  const normalisedQuery = searchQuery.trim().toLocaleLowerCase('en-IN');
  const filtered = useMemo(() => state.transactions
    .filter((transaction) => {
      const matchesSearch = !normalisedQuery || [transaction.payee, transaction.category, transaction.note ?? '', accountNames.get(transaction.accountId) ?? ''].some((value) => value.toLocaleLowerCase('en-IN').includes(normalisedQuery));
      return matchesSearch
        && (type === 'all' || transaction.type === type)
        && (accountId === 'all' || transaction.accountId === accountId || transaction.toAccountId === accountId)
        && (category === 'all' || transaction.category === category)
        && (!dateFrom || transaction.occurredOn >= dateFrom)
        && (!dateTo || transaction.occurredOn <= dateTo)
        && (!minimumMinor || transaction.amountMinor >= minimumMinor)
        && (!maximumMinor || transaction.amountMinor <= maximumMinor);
    })
    .sort((a, b) => sort === 'newest' ? b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt) : sort === 'oldest' ? a.occurredOn.localeCompare(b.occurredOn) : sort === 'highest' ? b.amountMinor - a.amountMinor : a.amountMinor - b.amountMinor),
  [state.transactions, normalisedQuery, accountNames, type, accountId, category, dateFrom, dateTo, minimumMinor, maximumMinor, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allPageSelected = pageRows.length > 0 && pageRows.every((transaction) => selected.has(transaction.id));
  const activeFilterCount = [type !== 'all', accountId !== 'all', category !== 'all', dateFrom, dateTo, minimum, maximum].filter(Boolean).length;

  useEffect(() => { setPage(1); }, [searchQuery, type, accountId, category, dateFrom, dateTo, minimum, maximum, sort]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => { setSelected((current) => new Set([...current].filter((id) => state.transactions.some((transaction) => transaction.id === id)))); }, [state.transactions]);

  const clearFilters = () => { setType('all'); setAccountId('all'); setCategory('all'); setDateFrom(''); setDateTo(''); setMinimum(''); setMaximum(''); onSearchChange(''); };
  const togglePage = () => setSelected((current) => { const next = new Set(current); pageRows.forEach((transaction) => allPageSelected ? next.delete(transaction.id) : next.add(transaction.id)); return next; });
  const selectedTransactions = state.transactions.filter((transaction) => selected.has(transaction.id));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-sm font-semibold text-[var(--primary)]">Money activity</p><h1 className="mt-1 text-[clamp(1.65rem,3vw,2.2rem)] font-bold tracking-[-0.035em]">Transactions</h1><p className="mt-1.5 text-sm text-[var(--muted-ink)]">Review, correct and move your financial records safely.</p></div>
        <button className="primary-button self-start" type="button" onClick={onAdd}><Plus aria-hidden="true" className="size-4" />Add transaction</button>
      </div>

      <section className="panel print:hidden" aria-labelledby="filters-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="filters-title" className="section-title">Find transactions</h2><p className="section-copy">Search and combine filters. Your results update immediately.</p></div>{activeFilterCount > 0 && <button className="secondary-button inline-flex" type="button" onClick={clearFilters}><FilterX aria-hidden="true" className="size-4" />Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}</button>}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="field-group sm:col-span-2"><span className="field-label">Search</span><span className="control flex items-center gap-2"><Search aria-hidden="true" className="size-4 shrink-0 text-[var(--muted-ink)]" /><input className="min-w-0 flex-1 bg-transparent outline-none" type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Payee, note, category or account" /></span></label>
          <label className="field-group"><span className="field-label">Type</span><select className="control" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option></select></label>
          <label className="field-group"><span className="field-label">Account</span><select className="control" value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="all">All accounts</option>{state.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="field-group"><span className="field-label">Category</span><select className="control" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="field-group"><span className="field-label">From date</span><input className="control" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label className="field-group"><span className="field-label">To date</span><input className="control" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
          <label className="field-group"><span className="field-label">Sort by</span><select className="control" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select></label>
          <label className="field-group"><span className="field-label">Minimum amount</span><input className="control" inputMode="decimal" value={minimum} onChange={(event) => setMinimum(event.target.value)} placeholder="₹0" /></label>
          <label className="field-group"><span className="field-label">Maximum amount</span><input className="control" inputMode="decimal" value={maximum} onChange={(event) => setMaximum(event.target.value)} placeholder="No limit" /></label>
        </div>
      </section>

      <section className="panel mt-4" aria-labelledby="history-title">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 id="history-title" className="section-title">Transaction history</h2><p className="section-copy" aria-live="polite">{filtered.length} matching transaction{filtered.length === 1 ? '' : 's'}</p></div>
          <div className="flex flex-wrap gap-2 print:hidden"><button className="secondary-button inline-flex" type="button" onClick={onImport}><Upload aria-hidden="true" className="size-4" />Import CSV</button><button className="secondary-button inline-flex" type="button" disabled={filtered.length === 0} onClick={() => onExportCsv(filtered)}><ArrowDownToLine aria-hidden="true" className="size-4" />Export CSV</button><button className="secondary-button inline-flex" type="button" disabled={filtered.length === 0} onClick={onPrint}><FileText aria-hidden="true" className="size-4" />Print / PDF</button></div>
        </div>

        {selected.size > 0 && <div className="mt-4 hidden items-center justify-between gap-3 rounded-xl bg-[var(--soft-blue)] p-3 text-sm text-[var(--info-strong)] md:flex"><span><strong>{selected.size}</strong> selected</span><button className="danger-button inline-flex" type="button" onClick={() => onDelete(selectedTransactions)}><Trash2 aria-hidden="true" className="size-4" />Delete selected</button></div>}

        {pageRows.length > 0 ? <>
          <div className="mt-2 hidden overflow-x-auto md:block">
            <table className="data-table min-w-[900px]"><thead><tr><th className="w-10 print:hidden"><input className="size-4 accent-[var(--primary)]" type="checkbox" checked={allPageSelected} onChange={togglePage} aria-label="Select all transactions on this page" /></th><th>Date</th><th>Payee</th><th>Category</th><th>Account</th><th>Type</th><th className="text-right">Amount</th><th className="w-24 text-right print:hidden">Actions</th></tr></thead><tbody>{pageRows.map((transaction) => <DesktopRow key={transaction.id} transaction={transaction} accountName={accountNames.get(transaction.accountId) ?? 'Unknown'} checked={selected.has(transaction.id)} onCheck={() => setSelected((current) => { const next = new Set(current); next.has(transaction.id) ? next.delete(transaction.id) : next.add(transaction.id); return next; })} onEdit={() => onEdit(transaction)} onDelete={() => onDelete([transaction])} />)}</tbody></table>
          </div>
          <ul className="divide-y divide-[var(--border)] md:hidden">{pageRows.map((transaction) => <MobileRow key={transaction.id} transaction={transaction} accountName={accountNames.get(transaction.accountId) ?? 'Unknown'} onEdit={() => onEdit(transaction)} onDelete={() => onDelete([transaction])} />)}</ul>
        </> : <div className="grid min-h-64 place-items-center text-center"><div><Search aria-hidden="true" className="mx-auto size-8 text-[var(--muted-ink)]" /><h3 className="mt-3 font-bold">No matching transactions</h3><p className="mt-1 text-sm text-[var(--muted-ink)]">Adjust or clear your filters to see more activity.</p><button className="secondary-button mt-4" type="button" onClick={clearFilters}>Reset filters</button></div></div>}

        {pageRows.length > 0 && <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm print:hidden"><span className="text-[var(--muted-ink)]">Page {page} of {pageCount}</span><div className="flex gap-2"><button className="secondary-button inline-flex" type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft aria-hidden="true" className="size-4" />Previous</button><button className="secondary-button inline-flex" type="button" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight aria-hidden="true" className="size-4" /></button></div></div>}
      </section>
    </div>
  );
}

function Amount({ transaction }: { transaction: Transaction }) {
  const prefix = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : '';
  return <strong className={`tabular-nums ${transaction.type === 'income' ? 'text-[var(--positive)]' : transaction.type === 'expense' ? 'text-[var(--danger)]' : ''}`}>{prefix}{formatMoney(transaction.amountMinor)}</strong>;
}

function DesktopRow({ transaction, accountName, checked, onCheck, onEdit, onDelete }: { transaction: Transaction; accountName: string; checked: boolean; onCheck: () => void; onEdit: () => void; onDelete: () => void }) {
  return <tr><td className="print:hidden"><input className="size-4 accent-[var(--primary)]" type="checkbox" checked={checked} onChange={onCheck} aria-label={`Select ${transaction.payee}`} /></td><td>{formatDate(transaction.occurredOn)}</td><td><strong>{transaction.payee}</strong>{transaction.note && <span className="mt-0.5 block max-w-52 truncate text-xs text-[var(--muted-ink)]">{transaction.note}</span>}</td><td>{transaction.category}</td><td>{accountName}</td><td><span className={`transaction-type transaction-type-${transaction.type}`}><Check aria-hidden="true" className="size-3" />{transaction.type}</span></td><td className="text-right"><Amount transaction={transaction} /></td><td className="print:hidden"><div className="flex justify-end gap-1"><button className="row-action" type="button" aria-label={`Edit ${transaction.payee}`} onClick={onEdit}><Pencil aria-hidden="true" /></button><button className="row-action text-[var(--danger-strong)]" type="button" aria-label={`Delete ${transaction.payee}`} onClick={onDelete}><Trash2 aria-hidden="true" /></button></div></td></tr>;
}

function MobileRow({ transaction, accountName, onEdit, onDelete }: { transaction: Transaction; accountName: string; onEdit: () => void; onDelete: () => void }) {
  return <li className="py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm">{transaction.payee}</strong><span className="mt-1 block text-xs text-[var(--muted-ink)]">{transaction.category} · {accountName}</span><span className="mt-1 block text-xs text-[var(--muted-ink)]">{formatDate(transaction.occurredOn)}</span></div><div className="shrink-0 text-right"><Amount transaction={transaction} /><span className={`transaction-type transaction-type-${transaction.type} mt-2 ml-auto`}>{transaction.type}</span></div></div><div className="mt-3 grid grid-cols-2 gap-2 print:hidden"><button className="secondary-button justify-center" type="button" onClick={onEdit}><Pencil aria-hidden="true" className="size-4" />Edit</button><button className="secondary-button justify-center text-[var(--danger-strong)]" type="button" onClick={onDelete}><Trash2 aria-hidden="true" className="size-4" />Delete</button></div></li>;
}
