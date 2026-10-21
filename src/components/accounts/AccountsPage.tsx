import { Archive, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, CheckCircle2, Landmark, Pencil, Plus, RotateCcw, Search, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate } from '../../lib/date';
import { getAccountSummary } from '../../lib/finance';
import { formatMoney } from '../../lib/money';
import type { Account, FinanceState, Transaction } from '../../types/finance';

interface AccountsPageProps {
  state: FinanceState;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (account: Account) => void;
  onArchive: (account: Account) => void;
  onRestore: (account: Account) => void;
  onTransfer: (account: Account) => void;
}

const accountIcons = { bank: Landmark, cash: Banknote, wallet: WalletCards };

export function AccountsPage({ state, searchQuery, onSearchChange, onAdd, onEdit, onArchive, onRestore, onTransfer }: AccountsPageProps) {
  const activeAccounts = state.accounts.filter((account) => !account.archived);
  const archivedAccounts = state.accounts.filter((account) => account.archived);
  const query = searchQuery.trim().toLocaleLowerCase('en-IN');
  const matchingAccounts = activeAccounts.filter((account) => !query || [account.name, account.institution, account.kind].some((value) => value.toLocaleLowerCase('en-IN').includes(query)));
  const [selectedId, setSelectedId] = useState(activeAccounts[0]?.id ?? '');
  const selected = activeAccounts.find((account) => account.id === selectedId) ?? activeAccounts[0];
  const selectedSummary = selected ? getAccountSummary(selected, state.transactions) : null;
  const selectedTransactions = selected ? state.transactions.filter((transaction) => transaction.accountId === selected.id || transaction.toAccountId === selected.id).slice(0, 6) : [];
  const totalBalance = activeAccounts.reduce((total, account) => total + getAccountSummary(account, state.transactions).currentBalanceMinor, 0);
  const bankBalance = activeAccounts.filter((account) => account.kind === 'bank').reduce((total, account) => total + getAccountSummary(account, state.transactions).currentBalanceMinor, 0);
  const readyBalance = activeAccounts.filter((account) => account.kind !== 'bank').reduce((total, account) => total + getAccountSummary(account, state.transactions).currentBalanceMinor, 0);

  useEffect(() => { if (selectedId && !activeAccounts.some((account) => account.id === selectedId)) setSelectedId(activeAccounts[0]?.id ?? ''); }, [activeAccounts, selectedId]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-[var(--primary)]">Your money locations</p><h1 className="mt-1 text-[clamp(1.65rem,3vw,2.2rem)] font-bold tracking-[-0.035em]">Accounts & wallets</h1><p className="mt-1.5 text-sm text-[var(--muted-ink)]">Balances reconcile automatically from opening values and transactions.</p></div><div className="flex gap-2"><button className="secondary-button inline-flex" type="button" disabled={!selected} onClick={() => selected && onTransfer(selected)}><ArrowLeftRight aria-hidden="true" className="size-4" />Transfer</button><button className="primary-button" type="button" onClick={onAdd}><Plus aria-hidden="true" className="size-4" />Add account</button></div></div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Active account summary">
        <Summary label="Total available" value={formatMoney(totalBalance)} context={`Across ${activeAccounts.length} active account${activeAccounts.length === 1 ? '' : 's'}`} icon={Landmark} />
        <Summary label="Bank accounts" value={formatMoney(bankBalance)} context={`${activeAccounts.filter((account) => account.kind === 'bank').length} bank account${activeAccounts.filter((account) => account.kind === 'bank').length === 1 ? '' : 's'} tracked`} icon={Landmark} />
        <Summary label="Cash & wallets" value={formatMoney(readyBalance)} context="Ready-access money" icon={WalletCards} tone="blue" />
        <Summary label="Reconciliation" value="Balanced" context="Opening balance + activity" icon={CheckCircle2} />
      </section>

      <section className="mt-4 panel" aria-labelledby="account-list-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="account-list-title" className="section-title">Active accounts</h2><p className="section-copy">Choose an account to inspect its balance movement.</p></div><label className="control flex min-w-0 items-center gap-2 sm:w-72"><Search aria-hidden="true" className="size-4 text-[var(--muted-ink)]" /><span className="sr-only">Search accounts</span><input className="min-w-0 flex-1 bg-transparent outline-none" type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search accounts" /></label></div>
        {matchingAccounts.length > 0 ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{matchingAccounts.map((account) => <AccountCard key={account.id} account={account} state={state} selected={selected?.id === account.id} onSelect={() => setSelectedId(account.id)} onEdit={() => onEdit(account)} onTransfer={() => onTransfer(account)} onArchive={() => onArchive(account)} />)}</div> : <div className="grid min-h-48 place-items-center text-center"><div><Search aria-hidden="true" className="mx-auto size-7 text-[var(--muted-ink)]" /><h3 className="mt-3 font-semibold">{searchQuery.trim() ? 'No matching accounts' : 'No accounts yet'}</h3><p className="mt-1 text-sm text-[var(--muted-ink)]">{searchQuery.trim() ? 'Try another account name or clear the search.' : 'Add a bank account, cash balance or digital wallet to get started.'}</p>{searchQuery.trim() && <button className="secondary-button mt-4" type="button" onClick={() => onSearchChange('')}>Clear search</button>}</div></div>}
      </section>

      {selected && selectedSummary && <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <article className="panel"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--primary)]">Balance reconciliation</p><h2 className="mt-1 text-xl font-bold">{selected.name}</h2><p className="section-copy">Every rupee in the current balance is accounted for.</p></div><span className={`account-icon account-icon-${selected.accent}`}>{(() => { const Icon = accountIcons[selected.kind]; return <Icon aria-hidden="true" className="size-5" />; })()}</span></div>
          <div className="mt-6 grid grid-cols-[1fr_auto] gap-x-4 gap-y-4 text-sm"><span className="text-[var(--muted-ink)]">Opening balance</span><strong className="text-right tabular-nums">{formatMoney(selected.openingBalanceMinor)}</strong><span className="text-[var(--muted-ink)]">Money in</span><strong className="text-right tabular-nums text-[var(--positive)]">+{formatMoney(selectedSummary.moneyInMinor)}</strong><span className="text-[var(--muted-ink)]">Money out</span><strong className="text-right tabular-nums text-[var(--danger)]">−{formatMoney(selectedSummary.moneyOutMinor)}</strong><span className="border-t border-[var(--border)] pt-4 font-bold">Current balance</span><strong className="border-t border-[var(--border)] pt-4 text-right text-lg tabular-nums">{formatMoney(selectedSummary.currentBalanceMinor)}</strong></div>
          <div className="mt-5 flex flex-wrap gap-2"><button className="secondary-button inline-flex" type="button" onClick={() => onEdit(selected)}><Pencil aria-hidden="true" className="size-4" />Edit account</button><button className="secondary-button inline-flex" type="button" onClick={() => onTransfer(selected)}><ArrowLeftRight aria-hidden="true" className="size-4" />Transfer money</button></div>
        </article>
        <article className="panel"><div><h2 className="section-title">Recent account activity</h2><p className="section-copy">Latest money movements involving {selected.name}</p></div>{selectedTransactions.length > 0 ? <ul className="mt-3">{selectedTransactions.map((transaction) => <ActivityRow key={transaction.id} transaction={transaction} account={selected} state={state} />)}</ul> : <div className="grid min-h-48 place-items-center text-center"><div><WalletCards aria-hidden="true" className="mx-auto size-7 text-[var(--muted-ink)]" /><h3 className="mt-3 font-semibold">No activity yet</h3><p className="mt-1 text-sm text-[var(--muted-ink)]">Add a transaction or transfer involving this account.</p></div></div>}</article>
      </section>}

      {archivedAccounts.length > 0 && <section className="panel mt-4" aria-labelledby="archived-title"><div><h2 id="archived-title" className="section-title">Archived accounts</h2><p className="section-copy">Hidden from available balance, but retained for historical accuracy.</p></div><ul className="mt-3 divide-y divide-[var(--border)]">{archivedAccounts.map((account) => <li key={account.id} className="flex min-h-[70px] items-center gap-3 py-3"><span className="account-icon account-icon-slate"><Archive aria-hidden="true" className="size-5" /></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{account.name}</strong><span className="text-xs text-[var(--muted-ink)]">{account.institution} · {formatMoney(getAccountSummary(account, state.transactions).currentBalanceMinor)}</span></div><button className="secondary-button inline-flex" type="button" onClick={() => onRestore(account)}><RotateCcw aria-hidden="true" className="size-4" />Restore</button></li>)}</ul></section>}
    </div>
  );
}

function Summary({ label, value, context, icon: Icon, tone }: { label: string; value: string; context: string; icon: typeof Landmark; tone?: 'blue' }) { return <article className="summary-card"><div className="flex items-start justify-between gap-2"><p className="text-xs text-[var(--muted-ink)] sm:text-sm">{label}</p><span className={`grid size-9 place-items-center rounded-xl ${tone === 'blue' ? 'bg-[var(--soft-blue)] text-[var(--info)]' : 'bg-[var(--soft-primary)] text-[var(--primary)]'}`}><Icon aria-hidden="true" className="size-[18px]" /></span></div><strong className="mt-5 block text-[clamp(1.15rem,2.5vw,1.65rem)] tracking-[-0.035em] tabular-nums">{value}</strong><p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">{context}</p></article>; }

function AccountCard({ account, state, selected, onSelect, onEdit, onTransfer, onArchive }: { account: Account; state: FinanceState; selected: boolean; onSelect: () => void; onEdit: () => void; onTransfer: () => void; onArchive: () => void }) {
  const summary = getAccountSummary(account, state.transactions); const Icon = accountIcons[account.kind];
  return <article className={`account-card account-card-${account.accent} ${selected ? 'account-card-selected' : ''}`}><button className="w-full text-left" type="button" aria-pressed={selected} onClick={onSelect}><span className={`account-icon account-icon-${account.accent}`}><Icon aria-hidden="true" className="size-5" /></span><span className="mt-4 block truncate text-sm font-bold">{account.name}</span><span className="mt-1 block truncate text-xs text-[var(--muted-ink)]">{account.institution}</span><strong className="mt-5 block text-xl tracking-[-0.03em] tabular-nums">{formatMoney(summary.currentBalanceMinor)}</strong><span className="mt-1 block text-xs text-[var(--muted-ink)]">{summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'}</span></button><div className="mt-4 grid grid-cols-3 gap-1 border-t border-[var(--border)] pt-3"><button className="row-action mx-auto" type="button" aria-label={`Transfer from ${account.name}`} onClick={onTransfer}><ArrowLeftRight aria-hidden="true" /></button><button className="row-action mx-auto" type="button" aria-label={`Edit ${account.name}`} onClick={onEdit}><Pencil aria-hidden="true" /></button><button className="row-action mx-auto" type="button" aria-label={`Archive ${account.name}`} onClick={onArchive}><Archive aria-hidden="true" /></button></div></article>;
}

function ActivityRow({ transaction, account, state }: { transaction: Transaction; account: Account; state: FinanceState }) {
  const incoming = transaction.type === 'income' || (transaction.type === 'transfer' && transaction.toAccountId === account.id);
  const otherAccount = transaction.type === 'transfer' ? state.accounts.find((item) => item.id === (incoming ? transaction.accountId : transaction.toAccountId)) : null;
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
  return <li className="grid min-h-[66px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--border)] first:border-t-0"><span className={`grid size-9 place-items-center rounded-xl ${incoming ? 'bg-[var(--soft-primary)] text-[var(--positive)]' : 'bg-[var(--soft-danger)] text-[var(--danger)]'}`}><Icon aria-hidden="true" className="size-4" /></span><div className="min-w-0"><strong className="block truncate text-sm">{transaction.payee}</strong><span className="block truncate text-xs text-[var(--muted-ink)]">{transaction.type === 'transfer' && otherAccount ? `${incoming ? 'From' : 'To'} ${otherAccount.name}` : transaction.category} · {formatDate(transaction.occurredOn)}</span></div><strong className={`text-sm tabular-nums ${incoming ? 'text-[var(--positive)]' : 'text-[var(--danger)]'}`}>{incoming ? '+' : '−'}{formatMoney(transaction.amountMinor)}</strong></li>;
}
