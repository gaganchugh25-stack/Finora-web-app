import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';

type AuthMode = 'sign-in' | 'sign-up';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLocaleLowerCase('en-IN');
    setError('');
    setNotice('');
    if (!cleanEmail || !cleanEmail.includes('@')) { setError('Enter a valid email address.'); return; }
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return; }

    setSubmitting(true);
    try {
      const client = getSupabase();
      if (mode === 'sign-in') {
        const { error: signInError } = await client.auth.signInWithPassword({ email: cleanEmail, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await client.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice('Check your email and open the confirmation link. You can then return here and sign in.');
          setMode('sign-in');
          setPassword('');
        }
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication could not be completed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[var(--canvas)] px-4 py-8 text-[var(--ink)] sm:grid sm:place-items-center sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-popover)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden min-h-[640px] flex-col justify-between bg-[var(--sidebar)] p-10 text-white lg:flex">
          <div className="flex items-center gap-3 text-2xl font-bold tracking-[-0.04em]"><span className="grid size-10 place-items-center rounded-[12px_12px_5px_12px] bg-[#75d1aa] text-base text-[#123528]">F</span>Finora</div>
          <div>
            <p className="text-sm font-semibold text-[#75d1aa]">Private finance, now securely synced</p>
            <h1 className="mt-4 max-w-md text-4xl font-bold leading-[1.08] tracking-[-0.045em]">Your complete financial workspace, available wherever you sign in.</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-[#d0ded7]">Supabase Authentication protects access while row-level security keeps every account’s financial records isolated.</p>
          </div>
          <div className="grid gap-3 text-sm text-[#dbe8e1]">
            <p className="flex items-center gap-3"><ShieldCheck aria-hidden="true" className="size-5 text-[#75d1aa]" />Only you can read or change your records</p>
            <p className="flex items-center gap-3"><LockKeyhole aria-hidden="true" className="size-5 text-[#75d1aa]" />No bank password or service key is stored</p>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center p-6 sm:p-10 lg:min-h-[640px]">
          <div className="mx-auto w-full max-w-sm">
            <div className="flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-[12px_12px_5px_12px] bg-[var(--primary)] font-bold text-white">F</span><span className="text-xl font-bold">Finora</span></div>
            <p className="mt-10 text-sm font-semibold text-[var(--primary)] lg:mt-0">Secure cloud workspace</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">{mode === 'sign-in' ? 'Sign in to load your private Finora records.' : 'Your existing records on this browser will be moved to your first Finora account.'}</p>

            <div className="mt-6 grid grid-cols-2 rounded-xl bg-[var(--muted)] p-1" aria-label="Authentication options">
              <button className={`min-h-11 rounded-lg text-sm font-bold ${mode === 'sign-in' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-pressed={mode === 'sign-in'} onClick={() => { setMode('sign-in'); setError(''); }}>Sign in</button>
              <button className={`min-h-11 rounded-lg text-sm font-bold ${mode === 'sign-up' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-pressed={mode === 'sign-up'} onClick={() => { setMode('sign-up'); setError(''); }}>Create account</button>
            </div>

            {notice && <div className="mt-5 flex gap-3 rounded-xl bg-[var(--soft-primary)] p-4 text-sm leading-5 text-[var(--positive-strong)]" role="status"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" /><span>{notice}</span></div>}
            {error && <div className="mt-5 rounded-xl bg-[var(--soft-danger)] p-4 text-sm leading-5 text-[var(--danger-strong)]" role="alert">{error}</div>}

            <form className="mt-6 grid gap-5" onSubmit={(event) => void submit(event)} noValidate>
              <div className="field-group"><label className="field-label" htmlFor="auth-email">Email address</label><input id="auth-email" className="control" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
              <div className="field-group"><label className="field-label" htmlFor="auth-password">Password</label><div className="relative"><input id="auth-password" className="control w-full pr-12" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-[var(--muted-ink)] hover:text-[var(--ink)]" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button></div></div>
              <button className="primary-button w-full justify-center" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in securely' : 'Create secure account'}{!submitting && <ArrowRight aria-hidden="true" className="size-4" />}</button>
            </form>
            <p className="mt-6 text-center text-xs leading-5 text-[var(--muted-ink)]">Your password is handled by Supabase Auth. Finora never stores it in financial records or browser backups.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthLoadingScreen() {
  return <main className="grid min-h-dvh place-items-center bg-[var(--canvas)] p-6 text-[var(--ink)]"><div className="text-center" role="status"><span className="mx-auto grid size-12 place-items-center rounded-[14px_14px_5px_14px] bg-[var(--primary)] text-lg font-bold text-white">F</span><p className="mt-4 text-sm font-semibold">Opening your secure workspace…</p></div></main>;
}

export function SupabaseConfigurationError() {
  return <main className="grid min-h-dvh place-items-center bg-[var(--canvas)] p-6 text-[var(--ink)]"><section className="panel max-w-lg text-center"><LockKeyhole aria-hidden="true" className="mx-auto size-8 text-[var(--danger-strong)]" /><h1 className="mt-4 text-xl font-bold">Backend configuration is missing</h1><p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the local environment, then rebuild Finora.</p></section></main>;
}
