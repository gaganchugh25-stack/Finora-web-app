import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Cloud, Database, Download, FileJson, IndianRupee, LaptopMinimal, LogOut, Moon, ShieldCheck, Sun, Trash2, Upload, UserRound, X } from 'lucide-react';
import { parseFinoraBackup } from '../../lib/settings';
import type { FinanceState, TransactionType } from '../../types/finance';
import type { AppTheme, FinoraBackup, UserPreferences } from '../../types/preferences';

interface SettingsPageProps {
  state: FinanceState;
  preferences: UserPreferences;
  theme: AppTheme;
  searchQuery: string;
  userEmail: string;
  syncStatus: 'loading' | 'saving' | 'saved' | 'error';
  onSignOut: () => Promise<void>;
  onSavePreferences: (preferences: UserPreferences) => void;
  onThemeChange: (theme: AppTheme) => void;
  onExportBackup: () => void;
  onRestoreBackup: (backup: FinoraBackup) => void;
  onResetData: () => void;
}

type DialogState = { kind: 'restore'; backup: FinoraBackup; fileName: string } | { kind: 'clear' } | null;

const sectionTerms = {
  account: 'account authentication email sign in sign out cloud sync secure',
  profile: 'profile name personal default transaction income expense transfer account wallet preferences',
  appearance: 'appearance theme light dark regional currency inr rupee india locale time zone ist',
  data: 'data privacy local browser export backup download restore import reset records json',
};

export function SettingsPage({ state, preferences, theme, searchQuery, userEmail, syncStatus, onSignOut, onSavePreferences, onThemeChange, onExportBackup, onRestoreBackup, onResetData }: SettingsPageProps) {
  const [draft, setDraft] = useState(preferences);
  const [nameError, setNameError] = useState('');
  const [fileError, setFileError] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const query = searchQuery.trim().toLocaleLowerCase('en-IN');
  const visible = useMemo(() => ({
    account: !query || sectionTerms.account.includes(query),
    profile: !query || sectionTerms.profile.includes(query),
    appearance: !query || sectionTerms.appearance.includes(query),
    data: !query || sectionTerms.data.includes(query),
  }), [query]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(preferences);
  const activeAccounts = state.accounts.filter((account) => !account.archived);

  useEffect(() => setDraft(preferences), [preferences]);

  const saveProfile = () => {
    const displayName = draft.displayName.trim().replace(/\s+/g, ' ');
    if (displayName.length < 2 || displayName.length > 40) { setNameError('Enter a name between 2 and 40 characters.'); return; }
    setNameError('');
    onSavePreferences({ ...draft, displayName });
  };

  const selectFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError('');
    if (!file.name.toLocaleLowerCase('en-IN').endsWith('.json')) { setFileError('Choose a .json Finora backup file.'); return; }
    if (file.size > 5_000_000) { setFileError('The backup must be smaller than 5 MB.'); return; }
    try {
      const backup = parseFinoraBackup(await file.text());
      setDialog({ kind: 'restore', backup, fileName: file.name });
    } catch (error) { setFileError(error instanceof Error ? error.message : 'The backup could not be read.'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const noResults = !visible.account && !visible.profile && !visible.appearance && !visible.data;
  return <div>
    <div className="mb-6"><p className="text-sm font-semibold text-[var(--primary)]">Finora preferences</p><h1 className="mt-1 text-[clamp(1.65rem,3vw,2.2rem)] font-bold tracking-[-0.035em]">Settings</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">Manage your secure account, entry defaults, appearance and cloud-backed financial data.</p></div>

    {noResults ? <section className="panel grid min-h-[280px] place-items-center text-center"><div><LaptopMinimal aria-hidden="true" className="mx-auto size-8 text-[var(--muted-ink)]" /><h2 className="mt-3 font-bold">No matching settings</h2><p className="mt-1 text-sm text-[var(--muted-ink)]">Try profile, theme, account, currency or backup.</p></div></section> : <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,.55fr)]">
      <div className="grid gap-4">
        {visible.account && <section className="panel" aria-labelledby="account-settings-title"><SettingsHeading id="account-settings-title" icon={Cloud} title="Account & cloud sync" copy="Your data is protected by Supabase Authentication and row-level security." /><div className="mt-5 rounded-xl bg-[var(--soft-primary)] p-4"><div className="flex items-start gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--positive-strong)]" /><div className="min-w-0"><strong className="block text-sm">{syncStatus === 'saved' ? 'Securely synced' : syncStatus === 'saving' ? 'Saving changes…' : syncStatus === 'error' ? 'Sync needs attention' : 'Opening cloud data…'}</strong><p className="mt-1 [overflow-wrap:anywhere] text-xs leading-5 text-[var(--positive-strong)]">Signed in as {userEmail}</p></div></div></div><button className="secondary-button mt-4 w-full justify-center" type="button" onClick={() => void onSignOut()}><LogOut aria-hidden="true" className="size-4" />Sign out</button></section>}
        {visible.profile && <section className="panel" aria-labelledby="profile-settings-title"><SettingsHeading id="profile-settings-title" icon={UserRound} title="Profile & entry defaults" copy="Used for your greeting and to prefill new transactions." />
          <form className="mt-5 grid gap-5" onSubmit={(event) => { event.preventDefault(); saveProfile(); }} noValidate>
            <div className="field-group"><label className="field-label" htmlFor="settings-display-name">Display name</label><input id="settings-display-name" className="control" value={draft.displayName} maxLength={40} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'settings-name-error' : 'settings-name-help'} onBlur={() => { if (draft.displayName.trim().length >= 2) setNameError(''); }} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} /><p id="settings-name-help" className="text-xs leading-5 text-[var(--muted-ink)]">Shown inside your private Finora workspace.</p>{nameError && <p id="settings-name-error" className="field-error" role="alert">{nameError}</p>}</div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="field-group"><label className="field-label" htmlFor="settings-default-type">Default transaction type</label><select id="settings-default-type" className="control" value={draft.defaultTransactionType} onChange={(event) => setDraft((current) => ({ ...current, defaultTransactionType: event.target.value as TransactionType }))}><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></select></div><div className="field-group"><label className="field-label" htmlFor="settings-default-account">Default account</label><select id="settings-default-account" className="control" value={draft.defaultAccountId} onChange={(event) => setDraft((current) => ({ ...current, defaultAccountId: event.target.value }))}><option value="">First active account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div></div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-4"><button className="secondary-button" type="button" disabled={!dirty} onClick={() => { setDraft(preferences); setNameError(''); }}>Discard</button><button className="primary-button" type="submit" disabled={!dirty}><Check aria-hidden="true" className="size-4" />Save preferences</button></div>
          </form>
        </section>}

        {visible.appearance && <section className="panel" aria-labelledby="appearance-settings-title"><SettingsHeading id="appearance-settings-title" icon={Sun} title="Appearance & region" copy="Choose a theme while keeping Indian financial formatting." /><fieldset className="mt-5"><legend className="field-label">Colour theme</legend><div className="mt-2 grid gap-3 sm:grid-cols-2"><ThemeChoice selected={theme === 'light'} label="Light" copy="Warm and clear" icon={Sun} onClick={() => onThemeChange('light')} /><ThemeChoice selected={theme === 'dark'} label="Dark" copy="Lower-light viewing" icon={Moon} onClick={() => onThemeChange('dark')} /></div></fieldset><div className="mt-5 grid gap-3 sm:grid-cols-2"><InfoCard icon={IndianRupee} label="Currency & number format" value="INR · en-IN" /><InfoCard icon={LaptopMinimal} label="Time zone" value="India Standard Time" /></div><p className="mt-4 text-xs leading-5 text-[var(--muted-ink)]">Regional settings use INR and IST to keep totals, dates and reports consistent.</p></section>}
      </div>

      {visible.data && <section className="panel xl:sticky xl:top-24" aria-labelledby="data-settings-title"><SettingsHeading id="data-settings-title" icon={Database} title="Data & privacy" copy="Your financial records are securely synced and cached locally for resilience." /><div className="mt-5 rounded-xl bg-[var(--soft-primary)] p-4"><div className="flex items-start gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--positive-strong)]" /><div><strong className="text-sm">Private Supabase storage</strong><p className="mt-1 text-xs leading-5 text-[var(--positive-strong)]">Row-level security permits only your signed-in user ID to read or change this workspace.</p></div></div></div><dl className="mt-4 grid grid-cols-2 gap-2"><Stat label="Transactions" value={state.transactions.length} /><Stat label="Accounts" value={state.accounts.length} /><Stat label="Budgets" value={state.budgets.length} /><Stat label="Savings goals" value={state.savingsGoals.length} /><Stat label="Recurring schedules" value={state.recurringTransactions.length} /></dl><div className="mt-5 grid gap-2"><button className="secondary-button w-full justify-center" type="button" onClick={onExportBackup}><Download aria-hidden="true" className="size-4" />Download full backup</button><input ref={fileInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void selectFile(event.target.files?.[0])} /><button className="secondary-button w-full justify-center" type="button" onClick={() => fileInputRef.current?.click()}><Upload aria-hidden="true" className="size-4" />Restore from backup</button>{fileError && <p className="field-error" role="alert">{fileError}</p>}</div><div className="mt-6 border-t border-[var(--border)] pt-5"><h3 className="text-sm font-bold text-[var(--danger-strong)]">Clear all financial data</h3><p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">Delete every account, transaction, recurring schedule, budget, savings goal and bill from both your cloud workspace and local cache. Your profile and theme stay unchanged.</p><button className="secondary-button mt-3 w-full justify-center text-[var(--danger-strong)]" type="button" onClick={() => setDialog({ kind: 'clear' })}><Trash2 aria-hidden="true" className="size-4" />Clear all financial data</button></div></section>}
    </div>}

    {dialog?.kind === 'restore' && <ConfirmationDialog title="Restore this backup?" description={`${dialog.fileName} contains ${dialog.backup.finance.transactions.length} transactions and ${dialog.backup.finance.accounts.length} accounts. It will replace your current cloud records, local cache and preferences.`} confirmLabel="Restore backup" icon={FileJson} onCancel={() => setDialog(null)} onConfirm={() => { onRestoreBackup(dialog.backup); setDialog(null); }} />}
    {dialog?.kind === 'clear' && <ConfirmationDialog title="Delete all financial data?" description="This permanently deletes every account, transaction, recurring schedule, budget, savings goal, savings activity and bill from your cloud workspace and local cache. Download a backup first if you may need these records later." confirmLabel="Delete everything" danger icon={AlertTriangle} onCancel={() => setDialog(null)} onConfirm={() => { onResetData(); setDialog(null); }} />}
  </div>;
}

function SettingsHeading({ id, icon: Icon, title, copy }: { id: string; icon: typeof UserRound; title: string; copy: string }) { return <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Icon aria-hidden="true" className="size-5" /></span><div><h2 id={id} className="section-title">{title}</h2><p className="section-copy">{copy}</p></div></div>; }
function ThemeChoice({ selected, label, copy, icon: Icon, onClick }: { selected: boolean; label: string; copy: string; icon: typeof Sun; onClick: () => void }) { return <button className={`settings-choice ${selected ? 'settings-choice-selected' : ''}`} type="button" aria-pressed={selected} onClick={onClick}><span className="grid size-10 place-items-center rounded-xl bg-[var(--muted)]"><Icon aria-hidden="true" className="size-5" /></span><span className="text-left"><strong className="block text-sm">{label}</strong><small className="mt-0.5 block text-xs text-[var(--muted-ink)]">{copy}</small></span>{selected && <Check aria-hidden="true" className="ml-auto size-5 text-[var(--primary)]" />}</button>; }
function InfoCard({ icon: Icon, label, value }: { icon: typeof IndianRupee; label: string; value: string }) { return <div className="rounded-xl bg-[var(--muted)] p-4"><Icon aria-hidden="true" className="size-5 text-[var(--muted-ink)]" /><span className="mt-3 block text-xs text-[var(--muted-ink)]">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-[var(--muted)] p-3"><dt className="text-[11px] text-[var(--muted-ink)]">{label}</dt><dd className="mt-1 text-lg font-bold tabular-nums">{value}</dd></div>; }

function ConfirmationDialog({ title, description, confirmLabel, danger = false, icon: Icon, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; danger?: boolean; icon: typeof FileJson; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [onCancel]);
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#10251b]/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-popover)]" role="alertdialog" aria-modal="true" aria-labelledby="settings-confirm-title" aria-describedby="settings-confirm-description"><button className="float-right grid size-10 place-items-center rounded-xl hover:bg-[var(--muted)]" type="button" aria-label="Close confirmation" onClick={onCancel}><X aria-hidden="true" className="size-4" /></button><span className={`grid size-11 place-items-center rounded-xl ${danger ? 'bg-[var(--soft-danger)] text-[var(--danger-strong)]' : 'bg-[var(--soft-blue)] text-[var(--info-strong)]'}`}><Icon aria-hidden="true" className="size-5" /></span><h2 id="settings-confirm-title" className="mt-4 text-xl font-bold">{title}</h2><p id="settings-confirm-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">{description}</p><div className="mt-6 flex flex-wrap justify-end gap-2"><button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className={danger ? 'danger-button' : 'primary-button'} type="button" onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
