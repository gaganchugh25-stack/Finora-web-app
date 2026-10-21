import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Banknote, Check, Landmark, WalletCards, X } from 'lucide-react';
import { parseNonNegativeMoneyToMinor } from '../../lib/money';
import type { Account, AccountInput, AccountKind } from '../../types/finance';

interface AccountDrawerProps {
  open: boolean;
  account?: Account | null;
  onClose: () => void;
  onSubmit: (input: AccountInput) => void;
}

type Errors = Partial<Record<'name' | 'institution' | 'openingBalance', string>>;
const accents: Account['accent'][] = ['emerald', 'blue', 'amber', 'slate'];
const accountKindOptions: Array<{
  value: AccountKind;
  label: string;
  description: string;
  Icon: typeof Landmark;
}> = [
  { value: 'bank', label: 'Bank account', description: 'Savings, salary or current account', Icon: Landmark },
  { value: 'cash', label: 'Cash balance', description: 'Physical cash held with you', Icon: Banknote },
  { value: 'wallet', label: 'Digital wallet', description: 'UPI or prepaid wallet balance', Icon: WalletCards },
];

const accountKindCopy: Record<AccountKind, {
  nameLabel: string;
  namePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  addLabel: string;
}> = {
  bank: {
    nameLabel: 'Account name',
    namePlaceholder: 'e.g. HDFC Bank',
    descriptionLabel: 'Account description',
    descriptionPlaceholder: 'e.g. Salary account',
    addLabel: 'Add bank account',
  },
  cash: {
    nameLabel: 'Cash name',
    namePlaceholder: 'e.g. Cash in hand',
    descriptionLabel: 'Cash description',
    descriptionPlaceholder: 'e.g. Personal cash wallet',
    addLabel: 'Add cash balance',
  },
  wallet: {
    nameLabel: 'Wallet name',
    namePlaceholder: 'e.g. Paytm Wallet',
    descriptionLabel: 'Wallet provider or purpose',
    descriptionPlaceholder: 'e.g. Everyday payments',
    addLabel: 'Add digital wallet',
  },
};

export function AccountDrawer({ open, account, onClose, onSubmit }: AccountDrawerProps) {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [kind, setKind] = useState<AccountKind>('bank');
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [accent, setAccent] = useState<Account['accent']>('emerald');
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const editing = Boolean(account);
  const selectedKindCopy = accountKindCopy[kind];
  const dirty = account
    ? name !== account.name || institution !== account.institution || kind !== account.kind || openingBalance !== (account.openingBalanceMinor / 100).toFixed(2) || accent !== account.accent
    : Boolean(name || institution || openingBalance !== '0.00' || kind !== 'bank' || accent !== 'emerald');

  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? ''); setInstitution(account?.institution ?? ''); setKind(account?.kind ?? 'bank');
    setOpeningBalance(account ? (account.openingBalanceMinor / 100).toFixed(2) : '0.00'); setAccent(account?.accent ?? 'emerald');
    setErrors({}); setSubmitted(false); setConfirmClose(false);
    window.setTimeout(() => nameRef.current?.focus(), 50);
  }, [open, account]);

  useEffect(() => { if (submitted && Object.keys(errors).length > 0) errorSummaryRef.current?.focus(); }, [errors, submitted]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmClose) setConfirmClose(false); else if (dirty) setConfirmClose(true); else onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, confirmClose, dirty, onClose]);

  if (!open) return null;

  const validate = () => {
    const next: Errors = {};
    const amountMinor = parseNonNegativeMoneyToMinor(openingBalance);
    if (!name.trim()) next.name = 'Enter a clear account name.';
    if (!institution.trim()) next.institution = 'Enter the bank, provider or account description.';
    if (amountMinor === null) next.openingBalance = 'Enter zero or a positive amount with up to two decimal places.';
    return { next, amountMinor };
  };
  const close = () => { if (dirty) setConfirmClose(true); else onClose(); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setSubmitted(true);
    const result = validate(); setErrors(result.next);
    if (result.amountMinor === null || Object.keys(result.next).length > 0) return;
    onSubmit({ name: name.trim(), institution: institution.trim(), kind, openingBalanceMinor: result.amountMinor, accent });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#10251b]/45 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="drawer-enter relative flex h-dvh w-full max-w-[470px] flex-col overflow-y-auto bg-[var(--surface)] p-5 shadow-[-18px_0_50px_rgba(21,42,31,0.18)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="account-form-title">
        <div className="flex items-start justify-between gap-4"><div><h2 id="account-form-title" className="text-2xl font-bold tracking-[-0.03em]">{editing ? 'Edit account' : 'Add account'}</h2><p className="mt-1 text-sm text-[var(--muted-ink)]">{editing ? 'Update account details while preserving its history.' : 'Add a bank account, cash balance or wallet.'}</p></div><button className="icon-button" type="button" aria-label={`Close ${editing ? 'edit' : 'add'} account`} onClick={close}><X aria-hidden="true" /></button></div>

        <form className="mt-6 flex flex-1 flex-col" onSubmit={submit} noValidate>
          {submitted && Object.keys(errors).length > 0 && <div ref={errorSummaryRef} className="mb-5 rounded-xl bg-[var(--soft-danger)] p-4 text-sm text-[var(--danger-strong)] outline-none" role="alert" tabIndex={-1}><div className="flex gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><div><h3 className="font-bold">Check the highlighted fields</h3><ul className="mt-2 list-disc space-y-1 pl-4">{Object.entries(errors).map(([field, message]) => <li key={field}><a className="underline underline-offset-2" href={`#account-${field}`}>{message}</a></li>)}</ul></div></div></div>}

          <fieldset>
            <legend className="field-label">What would you like to add?</legend>
            <div className="mt-2 grid gap-2">
              {accountKindOptions.map(({ value, label, description, Icon }) => {
                const selected = kind === value;
                return (
                  <label
                    key={value}
                    className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${selected ? 'border-[var(--primary)] bg-[var(--soft-primary)] text-[var(--primary-strong)]' : 'border-[var(--border)] hover:bg-[var(--muted)]'}`}
                  >
                    <input className="sr-only" type="radio" name="account-kind" value={value} checked={selected} onChange={() => setKind(value)} />
                    <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${selected ? 'bg-[var(--surface)]' : 'bg-[var(--muted)]'}`}><Icon aria-hidden="true" className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{label}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-[var(--muted-ink)]">{description}</span>
                    </span>
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${selected ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)]'}`} aria-hidden="true">{selected && <Check className="size-3.5" strokeWidth={3} />}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-4">
            <div className="field-group"><label className="field-label" htmlFor="account-name">{selectedKindCopy.nameLabel}</label><input ref={nameRef} id="account-name" className="control" value={name} onChange={(event) => setName(event.target.value)} placeholder={selectedKindCopy.namePlaceholder} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'account-name-error' : undefined} />{errors.name && <p id="account-name-error" className="field-error">{errors.name}</p>}</div>
            <div className="field-group"><label className="field-label" htmlFor="account-institution">{selectedKindCopy.descriptionLabel}</label><input id="account-institution" className="control" value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder={selectedKindCopy.descriptionPlaceholder} aria-invalid={Boolean(errors.institution)} aria-describedby={errors.institution ? 'account-institution-error' : undefined} />{errors.institution && <p id="account-institution-error" className="field-error">{errors.institution}</p>}</div>
            <div className="field-group"><label className="field-label" htmlFor="account-openingBalance">Opening balance</label><div className="control flex items-center gap-2"><span className="font-semibold text-[var(--muted-ink)]">₹</span><input id="account-openingBalance" className="min-w-0 flex-1 bg-transparent outline-none" inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} aria-invalid={Boolean(errors.openingBalance)} aria-describedby={`opening-help${errors.openingBalance ? ' account-openingBalance-error' : ''}`} /></div><p id="opening-help" className="text-xs leading-5 text-[var(--muted-ink)]">{editing ? 'Changing this adjusts the current balance without modifying past transactions.' : 'Enter the balance before the first Finora transaction.'}</p>{errors.openingBalance && <p id="account-openingBalance-error" className="field-error">{errors.openingBalance}</p>}</div>
          </div>

          <fieldset className="mt-5"><legend className="field-label">Card colour</legend><div className="mt-2 flex gap-3">{accents.map((option) => <button key={option} className={`account-swatch account-swatch-${option} ${accent === option ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)]' : ''}`} type="button" aria-label={`${option} card colour`} aria-pressed={accent === option} onClick={() => setAccent(option)} />)}</div></fieldset>

          <div className="mt-auto grid grid-cols-[1fr_1.4fr] gap-3 pt-8"><button className="secondary-button" type="button" onClick={close}>Cancel</button><button className="primary-button justify-center" type="submit">{editing ? 'Save changes' : selectedKindCopy.addLabel}</button></div>
        </form>

        {confirmClose && <div className="absolute inset-0 z-10 grid place-items-center bg-[#10251b]/40 p-5" role="alertdialog" aria-modal="true" aria-labelledby="discard-account-title" aria-describedby="discard-account-description"><div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-popover)]"><h3 id="discard-account-title" className="text-lg font-bold">Discard {editing ? 'changes' : 'this account'}?</h3><p id="discard-account-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">Your account details will not be saved.</p><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>Keep editing</button><button className="danger-button" type="button" onClick={onClose}>Discard</button></div></div></div>}
      </section>
    </div>
  );
}
