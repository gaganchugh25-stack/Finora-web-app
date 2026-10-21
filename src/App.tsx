import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AlertTriangle, CheckCircle2, Info, Trash2, X } from 'lucide-react';
import { Dashboard } from './components/dashboard/Dashboard';
import { AppShell } from './components/layout/AppShell';
import { AddTransactionDrawer } from './components/transactions/AddTransactionDrawer';
import { ImportTransactionsDialog } from './components/transactions/ImportTransactionsDialog';
import { TransactionsPage } from './components/transactions/TransactionsPage';
import { AccountDrawer } from './components/accounts/AccountDrawer';
import { AccountsPage } from './components/accounts/AccountsPage';
import { BudgetDrawer } from './components/budgets/BudgetDrawer';
import { BudgetsPage } from './components/budgets/BudgetsPage';
import { SavingsActivityDrawer } from './components/savings/SavingsActivityDrawer';
import { SavingsGoalDrawer } from './components/savings/SavingsGoalDrawer';
import { SavingsPage } from './components/savings/SavingsPage';
import { CalendarPage } from './components/calendar/CalendarPage';
import { BillDrawer } from './components/bills/BillDrawer';
import { BillsPage } from './components/bills/BillsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { RecurringDrawer } from './components/recurring/RecurringDrawer';
import { RecurringPage } from './components/recurring/RecurringPage';
import { getAppNotifications, NotificationPanel } from './components/notifications/NotificationPanel';
import { importPreviewRows, transactionsToCsv, type ImportPreviewRow } from './lib/csv';
import { addAccount, addBill, addBudget, addRecurringTransaction, addSavingsActivity, addSavingsGoal, addTransaction as createTransaction, deleteBill, deleteBudget, deleteRecurringTransaction, deleteSavingsGoal, deleteTransactions, payBill, recordRecurringTransaction, setAccountArchived, setRecurringActive, updateAccount, updateBill, updateBudget, updateRecurringTransaction, updateSavingsGoal, updateTransaction } from './lib/finance';
import { clearFinanceState, loadFinanceState, saveFinanceState } from './services/storage';
import { loadPreferences, savePreferences } from './services/preferences';
import { reportToCsv, type ReportAnalytics } from './lib/reports';
import { createFinoraBackup } from './lib/settings';
import { getTodayKey } from './lib/date';
import { AuthLoadingScreen, AuthPage, SupabaseConfigurationError } from './components/auth/AuthPage';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { CLOUD_OWNER_KEY, emptyCloudBundle, loadOrCreateCloudBundle, saveCloudBundle } from './services/cloud';
import type { Account, AccountInput, BillInput, BillReminder, Budget, BudgetInput, NewTransactionInput, RecurringTransaction, RecurringTransactionInput, SavingsActivityInput, SavingsGoal, SavingsGoalInput, Transaction, TransactionType } from './types/finance';
import type { AppTheme, FinoraBackup, UserPreferences } from './types/preferences';

interface ToastState {
  message: string;
  tone: 'success' | 'info';
}

const ReportsPage = lazy(() => import('./components/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })));

function DeleteConfirmation({ targets, onCancel, onConfirm }: { targets: Transaction[]; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#10251b]/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-popover)]" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
        <span className="grid size-11 place-items-center rounded-xl bg-[var(--soft-danger)] text-[var(--danger-strong)]"><AlertTriangle aria-hidden="true" className="size-5" /></span>
        <h2 id="delete-title" className="mt-4 text-xl font-bold">Delete {targets.length === 1 ? 'this transaction' : `${targets.length} transactions`}?</h2>
        <p id="delete-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">This removes {targets.length === 1 ? <><strong>{targets[0].payee}</strong> and recalculates affected balances</> : 'the selected records and recalculates all affected balances'}. This action cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-2"><button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>Keep transaction{targets.length === 1 ? '' : 's'}</button><button className="danger-button inline-flex" type="button" onClick={onConfirm}><Trash2 aria-hidden="true" className="size-4" />Delete</button></div>
      </section>
    </div>
  );
}

function ArchiveAccountConfirmation({ account, onCancel, onConfirm }: { account: Account; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [onCancel]);
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#10251b]/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-popover)]" role="alertdialog" aria-modal="true" aria-labelledby="archive-title" aria-describedby="archive-description"><span className="grid size-11 place-items-center rounded-xl bg-[var(--soft-warning)] text-[var(--warning-strong)]"><AlertTriangle aria-hidden="true" className="size-5" /></span><h2 id="archive-title" className="mt-4 text-xl font-bold">Archive {account.name}?</h2><p id="archive-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">The account will be excluded from your available balance and new transactions. Its existing activity stays intact and you can restore it later.</p><div className="mt-6 flex justify-end gap-2"><button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>Keep active</button><button className="danger-button" type="button" onClick={onConfirm}>Archive account</button></div></section></div>;
}

function DeleteBudgetConfirmation({ budget, onCancel, onConfirm }: { budget: Budget; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [onCancel]);
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#10251b]/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-popover)]" role="alertdialog" aria-modal="true" aria-labelledby="delete-budget-title" aria-describedby="delete-budget-description"><span className="grid size-11 place-items-center rounded-xl bg-[var(--soft-danger)] text-[var(--danger-strong)]"><AlertTriangle aria-hidden="true" className="size-5" /></span><h2 id="delete-budget-title" className="mt-4 text-xl font-bold">Delete {budget.name}?</h2><p id="delete-budget-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">The spending limit will be removed. Your transactions and category history will not be changed.</p><div className="mt-6 flex justify-end gap-2"><button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>Keep budget</button><button className="danger-button inline-flex" type="button" onClick={onConfirm}><Trash2 aria-hidden="true" className="size-4" />Delete budget</button></div></section></div>;
}

function DeleteSavingsGoalConfirmation({ goal, onCancel, onConfirm }: { goal: SavingsGoal; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [onCancel]);
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#10251b]/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-popover)]" role="alertdialog" aria-modal="true" aria-labelledby="delete-goal-title" aria-describedby="delete-goal-description"><span className="grid size-11 place-items-center rounded-xl bg-[var(--soft-danger)] text-[var(--danger-strong)]"><AlertTriangle aria-hidden="true" className="size-5" /></span><h2 id="delete-goal-title" className="mt-4 text-xl font-bold">Delete {goal.name}?</h2><p id="delete-goal-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">The goal and its saving activity history will be removed. Account balances and transactions will not be changed.</p><div className="mt-6 flex justify-end gap-2"><button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>Keep goal</button><button className="danger-button inline-flex" type="button" onClick={onConfirm}><Trash2 aria-hidden="true" className="size-4" />Delete goal</button></div></section></div>;
}

function DeleteBillConfirmation({ bill, onCancel, onConfirm }: { bill: BillReminder; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [onCancel]);
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#10251b]/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-popover)]" role="alertdialog" aria-modal="true" aria-labelledby="delete-bill-title" aria-describedby="delete-bill-description"><span className="grid size-11 place-items-center rounded-xl bg-[var(--soft-danger)] text-[var(--danger-strong)]"><AlertTriangle aria-hidden="true" className="size-5" /></span><h2 id="delete-bill-title" className="mt-4 text-xl font-bold">Delete {bill.name}?</h2><p id="delete-bill-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">The bill reminder will be removed. {bill.paidTransactionId ? 'Its recorded expense transaction will remain so your account balance stays accurate.' : 'No transaction or account balance will be changed.'}</p><div className="mt-6 flex justify-end gap-2"><button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>Keep bill</button><button className="danger-button inline-flex" type="button" onClick={onConfirm}><Trash2 aria-hidden="true" className="size-4" />Delete bill</button></div></section></div>;
}

function PayBillConfirmation({ bill, onCancel, onConfirm }: { bill: BillReminder; onCancel: () => void; onConfirm: (paidOn: string) => void }) {
  const [paidOn, setPaidOn] = useState(getTodayKey); const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [onCancel]);
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#10251b]/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-popover)]" role="dialog" aria-modal="true" aria-labelledby="pay-bill-title" aria-describedby="pay-bill-description"><span className="grid size-11 place-items-center rounded-xl bg-[var(--soft-primary)] text-[var(--positive-strong)]"><CheckCircle2 aria-hidden="true" className="size-5" /></span><h2 id="pay-bill-title" className="mt-4 text-xl font-bold">Mark {bill.name} as paid?</h2><p id="pay-bill-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">This creates one expense transaction for the bill amount against its selected payment account.</p><div className="field-group mt-5"><label className="field-label" htmlFor="bill-paid-on">Payment date</label><input id="bill-paid-on" className="control" type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} /></div><div className="mt-6 flex justify-end gap-2"><button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="button" onClick={() => onConfirm(paidOn)}>Record payment</button></div></section></div>;
}

function DeleteRecurringConfirmation({ schedule, onCancel, onConfirm }: { schedule: RecurringTransaction; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [onCancel]);
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#10251b]/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-popover)]" role="alertdialog" aria-modal="true" aria-labelledby="delete-recurring-title"><span className="grid size-11 place-items-center rounded-xl bg-[var(--soft-danger)] text-[var(--danger-strong)]"><AlertTriangle aria-hidden="true" className="size-5" /></span><h2 id="delete-recurring-title" className="mt-4 text-xl font-bold">Delete {schedule.payee}?</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">The schedule will be removed. Transactions already recorded from it will remain unchanged.</p><div className="mt-6 flex justify-end gap-2"><button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>Keep schedule</button><button className="danger-button inline-flex" type="button" onClick={onConfirm}><Trash2 aria-hidden="true" className="size-4" />Delete schedule</button></div></section></div>;
}

function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('finora.theme');
  return saved === 'dark' ? 'dark' : 'light';
}

type SyncStatus = 'loading' | 'saving' | 'saved' | 'error';

function FinoraApp({ session, onSignOut }: { session: Session; onSignOut: () => Promise<void> }) {
  const userId = session.user.id;
  const userEmail = session.user.email ?? '';
  const [financeState, setFinanceState] = useState(loadFinanceState);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<Transaction[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Account | null>(null);
  const [budgetDrawerOpen, setBudgetDrawerOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteBudgetTarget, setDeleteBudgetTarget] = useState<Budget | null>(null);
  const [savingsGoalDrawerOpen, setSavingsGoalDrawerOpen] = useState(false);
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | null>(null);
  const [savingsActivityGoal, setSavingsActivityGoal] = useState<SavingsGoal | null>(null);
  const [deleteSavingsGoalTarget, setDeleteSavingsGoalTarget] = useState<SavingsGoal | null>(null);
  const [billDrawerOpen, setBillDrawerOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null);
  const [deleteBillTarget, setDeleteBillTarget] = useState<BillReminder | null>(null);
  const [payBillTarget, setPayBillTarget] = useState<BillReminder | null>(null);
  const [recurringDrawerOpen, setRecurringDrawerOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [deleteRecurringTarget, setDeleteRecurringTarget] = useState<RecurringTransaction | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [transactionPreset, setTransactionPreset] = useState<{ type: TransactionType; accountId?: string }>({ type: 'expense' });
  const [activeView, setActiveView] = useState<'overview' | 'transactions' | 'recurring' | 'accounts' | 'budgets' | 'savings' | 'calendar' | 'bills' | 'reports' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [cloudRetry, setCloudRetry] = useState(0);
  const saveRevisionRef = useRef(0);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    setCloudError('');
    setSyncStatus('loading');
    const localOwner = window.localStorage.getItem(CLOUD_OWNER_KEY);
    const displayName = userEmail.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Finora user';
    const seed = localOwner && localOwner !== userId
      ? emptyCloudBundle(displayName)
      : { finance: financeState, preferences, theme };

    void loadOrCreateCloudBundle(userId, seed)
      .then(({ bundle }) => {
        if (cancelled) return;
        setFinanceState(bundle.finance);
        setPreferences(bundle.preferences);
        setTheme(bundle.theme);
        window.localStorage.setItem(CLOUD_OWNER_KEY, userId);
        setCloudReady(true);
        setSyncStatus('saved');
      })
      .catch((error) => {
        if (cancelled) return;
        setCloudError(error instanceof Error ? error.message : 'The secure cloud workspace could not be loaded.');
        setSyncStatus('error');
      });

    return () => { cancelled = true; };
    // Initial local state is intentionally captured once as the first-account migration seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userEmail, cloudRetry]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('finora.theme', theme);
  }, [theme]);

  useEffect(() => {
    saveFinanceState(financeState);
  }, [financeState]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!cloudReady) return;
    const revision = ++saveRevisionRef.current;
    const snapshot = { finance: financeState, preferences, theme };
    setSyncStatus('saving');
    saveChainRef.current = saveChainRef.current
      .catch(() => undefined)
      .then(() => saveCloudBundle(userId, snapshot));
    void saveChainRef.current
      .then(() => { if (saveRevisionRef.current === revision) setSyncStatus('saved'); })
      .catch((error) => {
        if (saveRevisionRef.current === revision) {
          setSyncStatus('error');
          setToast({ message: error instanceof Error ? `Cloud sync failed: ${error.message}` : 'Cloud sync failed. Your local copy is still available.', tone: 'info' });
        }
      });
  }, [cloudReady, financeState, preferences, theme, userId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleAddTransaction = (input: NewTransactionInput) => {
    setFinanceState((current) => editingTransaction ? updateTransaction(current, editingTransaction.id, input) : createTransaction(current, input));
    setDrawerOpen(false);
    const wasEditing = Boolean(editingTransaction);
    setEditingTransaction(null);
    setToast({
      message: wasEditing ? 'Transaction updated and balances recalculated.' : input.type === 'transfer' ? 'Transfer saved. Income and expense totals are unchanged.' : `${input.type === 'income' ? 'Income' : 'Expense'} saved and dashboard totals updated.`,
      tone: 'success',
    });
  };

  const handleNavigate = (label: string) => {
    if (label === 'Overview' || label === 'Home') { setSearchQuery(''); setActiveView('overview'); return; }
    if (label === 'Transactions' || label === 'Activity') { setSearchQuery(''); setActiveView('transactions'); return; }
    if (label === 'Recurring') { setSearchQuery(''); setActiveView('recurring'); return; }
    if (label === 'Accounts') { setSearchQuery(''); setActiveView('accounts'); return; }
    if (label === 'Budgets') { setSearchQuery(''); setActiveView('budgets'); return; }
    if (label === 'Plan') { setSearchQuery(''); setActiveView('budgets'); return; }
    if (label === 'Savings') { setSearchQuery(''); setActiveView('savings'); return; }
    if (label === 'Calendar') { setSearchQuery(''); setActiveView('calendar'); return; }
    if (label === 'Bills') { setSearchQuery(''); setActiveView('bills'); return; }
    if (label === 'Reports') { setSearchQuery(''); setActiveView('reports'); return; }
    if (label === 'Settings') { setSearchQuery(''); setActiveView('settings'); return; }
  };

  const openAdd = (type: TransactionType = preferences.defaultTransactionType, accountId: string | undefined = preferences.defaultAccountId || undefined) => {
    if (!financeState.accounts.some((account) => !account.archived)) { setActiveView('accounts'); setToast({ message: 'Add an account before recording a transaction.', tone: 'info' }); return; }
    setEditingTransaction(null); setTransactionPreset({ type, accountId }); setDrawerOpen(true);
  };
  const openEdit = (transaction: Transaction) => { setEditingTransaction(transaction); setDrawerOpen(true); };
  const confirmDelete = () => {
    setFinanceState((current) => deleteTransactions(current, deleteTargets.map((transaction) => transaction.id)));
    setToast({ message: `${deleteTargets.length} transaction${deleteTargets.length === 1 ? '' : 's'} deleted and balances recalculated.`, tone: 'success' });
    setDeleteTargets([]);
  };
  const handleImport = (rows: ImportPreviewRow[]) => {
    const count = rows.filter((row) => row.input).length;
    setFinanceState((current) => importPreviewRows(current, rows));
    setImportOpen(false);
    setToast({ message: `${count} transaction${count === 1 ? '' : 's'} imported successfully.`, tone: 'success' });
  };
  const handleExportCsv = (transactions: Transaction[]) => {
    const blob = new Blob([transactionsToCsv(transactions, financeState)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `finora-transactions-${getTodayKey()}.csv`; link.click();
    URL.revokeObjectURL(url);
    setToast({ message: `${transactions.length} transaction${transactions.length === 1 ? '' : 's'} exported to CSV.`, tone: 'success' });
  };
  const openAccountAdd = () => { setEditingAccount(null); setAccountDrawerOpen(true); };
  const openAccountEdit = (account: Account) => { setEditingAccount(account); setAccountDrawerOpen(true); };
  const handleAccountSubmit = (input: AccountInput) => {
    const wasEditing = Boolean(editingAccount);
    setFinanceState((current) => editingAccount ? updateAccount(current, editingAccount.id, input) : addAccount(current, input));
    setAccountDrawerOpen(false); setEditingAccount(null);
    setToast({ message: wasEditing ? 'Account updated and balance reconciled.' : 'Account added and included in your available balance.', tone: 'success' });
  };
  const confirmArchive = () => {
    if (!archiveTarget) return;
    try {
      setFinanceState(setAccountArchived(financeState, archiveTarget.id, true));
      setToast({ message: `${archiveTarget.name} archived. Its history remains available.`, tone: 'success' });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'The account could not be archived.', tone: 'info' });
    }
    setArchiveTarget(null);
  };
  const restoreAccount = (account: Account) => { setFinanceState((current) => setAccountArchived(current, account.id, false)); setToast({ message: `${account.name} restored to active accounts.`, tone: 'success' }); };
  const openBudgetAdd = () => { setEditingBudget(null); setBudgetDrawerOpen(true); };
  const openBudgetEdit = (budget: Budget) => { setEditingBudget(budget); setBudgetDrawerOpen(true); };
  const handleBudgetSubmit = (input: BudgetInput) => {
    const wasEditing = Boolean(editingBudget);
    try {
      setFinanceState((current) => editingBudget ? updateBudget(current, editingBudget.id, input) : addBudget(current, input));
      setBudgetDrawerOpen(false); setEditingBudget(null);
      setToast({ message: wasEditing ? 'Budget updated and spending progress recalculated.' : 'Budget added and matched to existing expenses.', tone: 'success' });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'The budget could not be saved.', tone: 'info' });
    }
  };
  const confirmBudgetDelete = () => {
    if (!deleteBudgetTarget) return;
    setFinanceState((current) => deleteBudget(current, deleteBudgetTarget.id));
    setToast({ message: `${deleteBudgetTarget.name} deleted. Transactions were not changed.`, tone: 'success' });
    setDeleteBudgetTarget(null);
  };
  const openSavingsGoalAdd = () => { setEditingSavingsGoal(null); setSavingsGoalDrawerOpen(true); };
  const openSavingsGoalEdit = (goal: SavingsGoal) => { setEditingSavingsGoal(goal); setSavingsGoalDrawerOpen(true); };
  const handleSavingsGoalSubmit = (input: SavingsGoalInput) => {
    const wasEditing = Boolean(editingSavingsGoal);
    try {
      setFinanceState((current) => editingSavingsGoal ? updateSavingsGoal(current, editingSavingsGoal.id, input) : addSavingsGoal(current, input));
      setSavingsGoalDrawerOpen(false); setEditingSavingsGoal(null);
      setToast({ message: wasEditing ? 'Savings goal updated.' : 'Savings goal added and ready to track.', tone: 'success' });
    } catch (error) { setToast({ message: error instanceof Error ? error.message : 'The savings goal could not be saved.', tone: 'info' }); }
  };
  const handleSavingsActivity = (input: SavingsActivityInput) => {
    try {
      setFinanceState((current) => addSavingsActivity(current, input));
      setSavingsActivityGoal(null);
      setToast({ message: input.type === 'deposit' ? 'Savings added to the goal.' : 'Savings withdrawal recorded.', tone: 'success' });
    } catch (error) { setToast({ message: error instanceof Error ? error.message : 'The savings update could not be recorded.', tone: 'info' }); }
  };
  const confirmSavingsGoalDelete = () => {
    if (!deleteSavingsGoalTarget) return;
    setFinanceState((current) => deleteSavingsGoal(current, deleteSavingsGoalTarget.id));
    setToast({ message: `${deleteSavingsGoalTarget.name} deleted. Account balances were unchanged.`, tone: 'success' });
    setDeleteSavingsGoalTarget(null);
  };
  const openBillAdd = () => { setEditingBill(null); setBillDrawerOpen(true); };
  const openBillEdit = (bill: BillReminder) => { setEditingBill(bill); setBillDrawerOpen(true); };
  const handleBillSubmit = (input: BillInput) => {
    const wasEditing = Boolean(editingBill);
    try {
      setFinanceState((current) => editingBill ? updateBill(current, editingBill.id, input) : addBill(current, input));
      setBillDrawerOpen(false); setEditingBill(null);
      setToast({ message: wasEditing ? 'Bill updated and calendar reminder refreshed.' : 'Bill added to your payment plan and calendar.', tone: 'success' });
    } catch (error) { setToast({ message: error instanceof Error ? error.message : 'The bill could not be saved.', tone: 'info' }); }
  };
  const confirmBillDelete = () => { if (!deleteBillTarget) return; setFinanceState((current) => deleteBill(current, deleteBillTarget.id)); setToast({ message: `${deleteBillTarget.name} reminder deleted. Existing transactions were not changed.`, tone: 'success' }); setDeleteBillTarget(null); };
  const confirmBillPayment = (paidOn: string) => {
    if (!payBillTarget) return;
    try { setFinanceState((current) => payBill(current, payBillTarget.id, paidOn)); setToast({ message: `${payBillTarget.name} marked paid and added to expenses.`, tone: 'success' }); setPayBillTarget(null); }
    catch (error) { setToast({ message: error instanceof Error ? error.message : 'The bill payment could not be recorded.', tone: 'info' }); }
  };
  const openRecurringAdd = () => {
    if (!financeState.accounts.some((account) => !account.archived)) { setActiveView('accounts'); setToast({ message: 'Add an account before creating a recurring transaction.', tone: 'info' }); return; }
    setEditingRecurring(null); setRecurringDrawerOpen(true);
  };
  const handleRecurringSubmit = (input: RecurringTransactionInput) => {
    const wasEditing = Boolean(editingRecurring);
    try { setFinanceState((current) => editingRecurring ? updateRecurringTransaction(current, editingRecurring.id, input) : addRecurringTransaction(current, input)); setRecurringDrawerOpen(false); setEditingRecurring(null); setToast({ message: wasEditing ? 'Recurring schedule updated.' : 'Recurring schedule added.', tone: 'success' }); }
    catch (error) { setToast({ message: error instanceof Error ? error.message : 'The recurring schedule could not be saved.', tone: 'info' }); }
  };
  const toggleRecurring = (schedule: RecurringTransaction) => { try { setFinanceState((current) => setRecurringActive(current, schedule.id, !schedule.active)); setToast({ message: `${schedule.payee} ${schedule.active ? 'paused' : 'resumed'}.`, tone: 'success' }); } catch (error) { setToast({ message: error instanceof Error ? error.message : 'The schedule could not be updated.', tone: 'info' }); } };
  const recordRecurring = (schedule: RecurringTransaction) => { try { setFinanceState((current) => recordRecurringTransaction(current, schedule.id)); setToast({ message: `${schedule.payee} recorded for ${schedule.nextDueOn}. The next due date was advanced.`, tone: 'success' }); } catch (error) { setToast({ message: error instanceof Error ? error.message : 'The due entry could not be recorded.', tone: 'info' }); } };
  const confirmRecurringDelete = () => { if (!deleteRecurringTarget) return; setFinanceState((current) => deleteRecurringTransaction(current, deleteRecurringTarget.id)); setToast({ message: `${deleteRecurringTarget.payee} schedule deleted. Existing transactions were preserved.`, tone: 'success' }); setDeleteRecurringTarget(null); };
  const handleReportExport = (report: ReportAnalytics) => {
    const blob = new Blob([reportToCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `finora-report-${report.startOn}-to-${report.endOn}.csv`; link.click(); URL.revokeObjectURL(url);
    setToast({ message: 'Financial report exported to CSV.', tone: 'success' });
  };
  const handleSavePreferences = (next: UserPreferences) => { setPreferences(next); setToast({ message: 'Preferences saved and applied.', tone: 'success' }); };
  const handleBackupExport = () => {
    const backup = createFinoraBackup(financeState, preferences, theme);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `finora-backup-${getTodayKey()}.json`; link.click(); URL.revokeObjectURL(url);
    setToast({ message: 'Full local backup downloaded.', tone: 'success' });
  };
  const handleBackupRestore = (backup: FinoraBackup) => {
    setFinanceState(backup.finance); setPreferences(backup.preferences); setTheme(backup.theme);
    setToast({ message: 'Backup restored. Your records and preferences are now active.', tone: 'success' });
  };
  const handleDataReset = () => { setFinanceState(clearFinanceState()); setPreferences((current) => ({ ...current, defaultAccountId: '' })); setToast({ message: 'All financial data deleted. Your workspace is ready for your own records.', tone: 'success' }); };

  if (!cloudReady) {
    if (!cloudError) return <AuthLoadingScreen />;
    return <main className="grid min-h-dvh place-items-center bg-[var(--canvas)] p-6 text-[var(--ink)]"><section className="panel max-w-lg text-center" role="alert"><AlertTriangle aria-hidden="true" className="mx-auto size-8 text-[var(--danger-strong)]" /><h1 className="mt-4 text-xl font-bold">Your cloud workspace could not be opened</h1><p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">{cloudError}</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button className="secondary-button" type="button" onClick={() => void onSignOut()}>Sign out</button><button className="primary-button" type="button" onClick={() => setCloudRetry((current) => current + 1)}>Try again</button></div></section></main>;
  }

  const signOutAfterSync = async () => {
    try { await saveChainRef.current; await onSignOut(); }
    catch (error) { setToast({ message: error instanceof Error ? `Sign out failed: ${error.message}` : 'Sign out failed. Please try again.', tone: 'info' }); }
  };

  return (
    <>
      <AppShell
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddTransaction={() => openAdd()}
        onNavigate={handleNavigate}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
        activeView={activeView}
        displayName={preferences.displayName}
        syncStatus={syncStatus}
        notificationCount={getAppNotifications(financeState).length}
        notificationsOpen={notificationsOpen}
        onOpenNotifications={() => setNotificationsOpen((current) => !current)}
      >
        {activeView === 'overview' ? (
          <Dashboard state={financeState} searchQuery={searchQuery} onAddTransaction={openAdd} onViewTransactions={() => setActiveView('transactions')} />
        ) : activeView === 'transactions' ? (
          <TransactionsPage state={financeState} searchQuery={searchQuery} onSearchChange={setSearchQuery} onAdd={() => openAdd()} onEdit={openEdit} onDelete={setDeleteTargets} onImport={() => setImportOpen(true)} onExportCsv={handleExportCsv} onPrint={() => window.print()} />
        ) : activeView === 'recurring' ? (
          <RecurringPage state={financeState} searchQuery={searchQuery} onSearchChange={setSearchQuery} onAdd={openRecurringAdd} onEdit={(schedule) => { setEditingRecurring(schedule); setRecurringDrawerOpen(true); }} onDelete={setDeleteRecurringTarget} onToggle={toggleRecurring} onRecord={recordRecurring} />
        ) : activeView === 'accounts' ? (
          <AccountsPage state={financeState} searchQuery={searchQuery} onSearchChange={setSearchQuery} onAdd={openAccountAdd} onEdit={openAccountEdit} onArchive={setArchiveTarget} onRestore={restoreAccount} onTransfer={(account) => openAdd('transfer', account.id)} />
        ) : activeView === 'budgets' ? (
          <BudgetsPage state={financeState} searchQuery={searchQuery} onSearchChange={setSearchQuery} onAdd={openBudgetAdd} onEdit={openBudgetEdit} onDelete={setDeleteBudgetTarget} />
        ) : activeView === 'savings' ? (
          <SavingsPage state={financeState} searchQuery={searchQuery} onSearchChange={setSearchQuery} onAdd={openSavingsGoalAdd} onEdit={openSavingsGoalEdit} onDelete={setDeleteSavingsGoalTarget} onUpdateSavings={setSavingsActivityGoal} />
        ) : activeView === 'calendar' ? (
          <CalendarPage state={financeState} searchQuery={searchQuery} onSearchChange={setSearchQuery} onAddTransaction={() => openAdd()} />
        ) : activeView === 'bills' ? (
          <BillsPage state={financeState} searchQuery={searchQuery} onSearchChange={setSearchQuery} onAdd={openBillAdd} onEdit={openBillEdit} onDelete={setDeleteBillTarget} onPay={setPayBillTarget} />
        ) : activeView === 'reports' ? (
          <Suspense fallback={<div className="panel min-h-[420px] animate-pulse" aria-label="Loading reports"><div className="h-7 w-56 rounded bg-[var(--muted)]" /><div className="mt-4 h-4 w-96 max-w-full rounded bg-[var(--muted)]" /><div className="mt-8 grid grid-cols-2 gap-3"><div className="h-32 rounded-xl bg-[var(--muted)]" /><div className="h-32 rounded-xl bg-[var(--muted)]" /></div></div>}><ReportsPage state={financeState} searchQuery={searchQuery} onSearchChange={setSearchQuery} onExportCsv={handleReportExport} onPrint={() => window.print()} /></Suspense>
        ) : (
          <SettingsPage state={financeState} preferences={preferences} theme={theme} searchQuery={searchQuery} userEmail={userEmail} syncStatus={syncStatus} onSignOut={signOutAfterSync} onSavePreferences={handleSavePreferences} onThemeChange={setTheme} onExportBackup={handleBackupExport} onRestoreBackup={handleBackupRestore} onResetData={handleDataReset} />
        )}
      </AppShell>

      <AddTransactionDrawer open={drawerOpen} state={financeState} transaction={editingTransaction} initialType={transactionPreset.type} initialAccountId={transactionPreset.accountId} onClose={() => { setDrawerOpen(false); setEditingTransaction(null); }} onSubmit={handleAddTransaction} />
      <AccountDrawer open={accountDrawerOpen} account={editingAccount} onClose={() => { setAccountDrawerOpen(false); setEditingAccount(null); }} onSubmit={handleAccountSubmit} />
      <BudgetDrawer open={budgetDrawerOpen} state={financeState} budget={editingBudget} onClose={() => { setBudgetDrawerOpen(false); setEditingBudget(null); }} onSubmit={handleBudgetSubmit} />
      <SavingsGoalDrawer open={savingsGoalDrawerOpen} goal={editingSavingsGoal} onClose={() => { setSavingsGoalDrawerOpen(false); setEditingSavingsGoal(null); }} onSubmit={handleSavingsGoalSubmit} />
      <SavingsActivityDrawer open={Boolean(savingsActivityGoal)} goal={savingsActivityGoal} onClose={() => setSavingsActivityGoal(null)} onSubmit={handleSavingsActivity} />
      <BillDrawer open={billDrawerOpen} state={financeState} bill={editingBill} onClose={() => { setBillDrawerOpen(false); setEditingBill(null); }} onSubmit={handleBillSubmit} />
      <ImportTransactionsDialog open={importOpen} state={financeState} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <RecurringDrawer open={recurringDrawerOpen} state={financeState} schedule={editingRecurring} onClose={() => { setRecurringDrawerOpen(false); setEditingRecurring(null); }} onSubmit={handleRecurringSubmit} />
      <NotificationPanel open={notificationsOpen} state={financeState} onClose={() => setNotificationsOpen(false)} onNavigate={(destination) => { setNotificationsOpen(false); handleNavigate(destination); }} />

      {deleteTargets.length > 0 && (
        <DeleteConfirmation targets={deleteTargets} onCancel={() => setDeleteTargets([])} onConfirm={confirmDelete} />
      )}
      {archiveTarget && <ArchiveAccountConfirmation account={archiveTarget} onCancel={() => setArchiveTarget(null)} onConfirm={confirmArchive} />}
      {deleteBudgetTarget && <DeleteBudgetConfirmation budget={deleteBudgetTarget} onCancel={() => setDeleteBudgetTarget(null)} onConfirm={confirmBudgetDelete} />}
      {deleteSavingsGoalTarget && <DeleteSavingsGoalConfirmation goal={deleteSavingsGoalTarget} onCancel={() => setDeleteSavingsGoalTarget(null)} onConfirm={confirmSavingsGoalDelete} />}
      {deleteBillTarget && <DeleteBillConfirmation bill={deleteBillTarget} onCancel={() => setDeleteBillTarget(null)} onConfirm={confirmBillDelete} />}
      {payBillTarget && <PayBillConfirmation bill={payBillTarget} onCancel={() => setPayBillTarget(null)} onConfirm={confirmBillPayment} />}
      {deleteRecurringTarget && <DeleteRecurringConfirmation schedule={deleteRecurringTarget} onCancel={() => setDeleteRecurringTarget(null)} onConfirm={confirmRecurringDelete} />}

      {toast && (
        <div className={`fixed bottom-24 left-1/2 z-[70] flex w-[min(420px,calc(100%-32px))] -translate-x-1/2 items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-popover)] lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0 ${toast.tone === 'success' ? 'text-[var(--positive-strong)]' : 'text-[var(--info-strong)]'}`} role="status" aria-live="polite">
          {toast.tone === 'success' ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> : <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
          <p className="flex-1 text-sm leading-5">{toast.message}</p>
          <button className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--muted)]" type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X aria-hidden="true" className="size-4" /></button>
        </div>
      )}
    </>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  if (!isSupabaseConfigured) return <SupabaseConfigurationError />;
  if (!authReady) return <AuthLoadingScreen />;
  if (!session) return <AuthPage />;

  return <FinoraApp session={session} onSignOut={async () => { const { error } = await supabase!.auth.signOut(); if (error) throw error; }} />;
}
