import {
  BarChart3,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Goal,
  LayoutDashboard,
  List,
  Moon,
  Plus,
  ReceiptText,
  Repeat2,
  Search,
  Settings,
  Sun,
  WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddTransaction: () => void;
  onNavigate: (label: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeView: 'overview' | 'transactions' | 'recurring' | 'accounts' | 'budgets' | 'savings' | 'calendar' | 'bills' | 'reports' | 'settings';
  displayName: string;
  syncStatus: 'loading' | 'saving' | 'saved' | 'error';
  notificationCount: number;
  notificationsOpen: boolean;
  onOpenNotifications: () => void;
}

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', icon: LayoutDashboard },
      { label: 'Transactions', icon: List },
      { label: 'Recurring', icon: Repeat2 },
      { label: 'Accounts', icon: WalletCards },
      { label: 'Budgets', icon: ChartNoAxesCombined },
      { label: 'Savings', icon: Goal },
    ],
  },
  {
    label: 'Plan & review',
    items: [
      { label: 'Calendar', icon: CalendarDays },
      { label: 'Bills', icon: ReceiptText },
      { label: 'Reports', icon: BarChart3 },
    ],
  },
];

const mobileItems = [
  { label: 'Home', icon: LayoutDashboard },
  { label: 'Activity', icon: List },
  { label: 'Accounts', icon: WalletCards },
  { label: 'Plan', icon: Goal },
];

export function AppShell({
  children,
  searchQuery,
  onSearchChange,
  onAddTransaction,
  onNavigate,
  theme,
  onToggleTheme,
  activeView,
  displayName,
  syncStatus,
  notificationCount,
  notificationsOpen,
  onOpenNotifications,
}: AppShellProps) {
  const searchLabel = activeView === 'accounts' ? 'Search accounts' : activeView === 'transactions' ? 'Search transactions' : activeView === 'recurring' ? 'Search recurring transactions' : activeView === 'budgets' ? 'Search budgets' : activeView === 'savings' ? 'Search savings goals' : activeView === 'calendar' ? 'Search calendar' : activeView === 'bills' ? 'Search bills' : activeView === 'reports' ? 'Filter report details' : activeView === 'settings' ? 'Search settings' : 'Search recent transactions';
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('en-IN')).join('') || 'F';
  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-[var(--ink)]">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col bg-[var(--sidebar)] px-4 py-6 text-white lg:flex">
        <div className="flex items-center gap-3 px-2 text-[22px] font-bold tracking-[-0.03em]">
          <span className="grid size-8 place-items-center rounded-[10px_10px_4px_10px] bg-[#75d1aa] text-sm font-bold text-[#123528]">F</span>
          Finora
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-7" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab5a8]">{group.label}</p>
              <div className="grid gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = (activeView === 'overview' && item.label === 'Overview') || (activeView === 'transactions' && item.label === 'Transactions') || (activeView === 'recurring' && item.label === 'Recurring') || (activeView === 'accounts' && item.label === 'Accounts') || (activeView === 'budgets' && item.label === 'Budgets') || (activeView === 'savings' && item.label === 'Savings') || (activeView === 'calendar' && item.label === 'Calendar') || (activeView === 'bills' && item.label === 'Bills') || (activeView === 'reports' && item.label === 'Reports');
                  const available = true;
                  return (
                    <button
                      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#75d1aa] ${active ? 'bg-white/10 text-white' : 'text-[#d0ded7] hover:bg-white/7 hover:text-white'}`}
                      key={item.label}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onNavigate(item.label)}
                    >
                      <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                      <span>{item.label}</span>
                      {!available && <span className="ml-auto text-[11px] uppercase tracking-wide text-[#91aa9e]">Soon</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="rounded-2xl bg-white/7 p-3 text-xs leading-5 text-[#dbe8e1]">
          <strong className="block text-white">Private cloud workspace</strong>
          {syncStatus === 'saved' ? 'All changes are securely synced.' : syncStatus === 'saving' ? 'Saving your latest changes…' : syncStatus === 'error' ? 'Cloud sync needs attention.' : 'Opening secure cloud data…'}
        </div>
        <button className={`mt-3 flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] hover:bg-white/7 hover:text-white ${activeView === 'settings' ? 'bg-white/10 text-white' : 'text-[#d0ded7]'}`} type="button" aria-current={activeView === 'settings' ? 'page' : undefined} onClick={() => onNavigate('Settings')}>
          <Settings aria-hidden="true" className="size-[18px]" strokeWidth={1.8} /> Settings
        </button>
      </aside>

      <div className="lg:pl-[220px]">
        <header className="sticky top-0 z-30 flex min-h-[72px] items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--canvas)_94%,transparent)] px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid size-9 place-items-center rounded-[11px_11px_4px_11px] bg-[var(--primary)] text-sm font-bold text-white">F</span>
            <span className="hidden font-bold tracking-[-0.02em] sm:block">Finora</span>
          </div>

          <label className="flex min-h-11 min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--muted-ink)] focus-within:border-[var(--primary)] focus-within:ring-3 focus-within:ring-[var(--focus)]">
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <span className="sr-only">{searchLabel}</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted-ink)]"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchLabel}
            />
          </label>

          <button className="icon-button hidden sm:grid" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={onToggleTheme}>
            {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
          </button>
          <button className="icon-button relative" type="button" aria-label={notificationCount ? `Notifications, ${notificationCount} requiring attention` : 'Notifications, none requiring attention'} aria-expanded={notificationsOpen} aria-controls="notifications-panel" onClick={onOpenNotifications}>
            <Bell aria-hidden="true" />
            {notificationCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--surface)]" aria-hidden="true">{notificationCount > 9 ? '9+' : notificationCount}</span>}
          </button>
          <button className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 hover:bg-[var(--muted)]" type="button" aria-label={`Open settings. Cloud sync ${syncStatus}`} aria-current={activeView === 'settings' ? 'page' : undefined} onClick={() => onNavigate('Settings')}><span className="relative grid size-9 place-items-center rounded-full bg-[var(--soft-primary)] text-xs font-bold text-[var(--primary-strong)]">{initials}<span className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-[var(--surface)] ${syncStatus === 'error' ? 'bg-[var(--danger)]' : syncStatus === 'saving' || syncStatus === 'loading' ? 'bg-[var(--warning)]' : 'bg-[var(--positive)]'}`} aria-hidden="true" /></span><span className="hidden text-sm font-semibold xl:block">{displayName.split(/\s+/)[0]}</span></button>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {(activeView === 'transactions' || activeView === 'recurring') && <nav className="mb-4 grid grid-cols-2 rounded-xl bg-[var(--muted)] p-1 lg:hidden" aria-label="Activity sections"><button className={`min-h-11 rounded-lg px-3 text-xs font-bold ${activeView === 'transactions' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-current={activeView === 'transactions' ? 'page' : undefined} onClick={() => onNavigate('Transactions')}>Transactions</button><button className={`min-h-11 rounded-lg px-3 text-xs font-bold ${activeView === 'recurring' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-current={activeView === 'recurring' ? 'page' : undefined} onClick={() => onNavigate('Recurring')}>Recurring</button></nav>}
          {(activeView === 'budgets' || activeView === 'savings' || activeView === 'calendar' || activeView === 'bills' || activeView === 'reports') && <nav className="mb-4 grid grid-cols-5 rounded-xl bg-[var(--muted)] p-1 lg:hidden" aria-label="Planning sections"><button className={`min-h-11 rounded-lg px-0.5 text-[10px] font-bold sm:text-xs ${activeView === 'budgets' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-current={activeView === 'budgets' ? 'page' : undefined} onClick={() => onNavigate('Budgets')}>Budgets</button><button className={`min-h-11 rounded-lg px-0.5 text-[10px] font-bold sm:text-xs ${activeView === 'savings' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-current={activeView === 'savings' ? 'page' : undefined} onClick={() => onNavigate('Savings')}>Savings</button><button className={`min-h-11 rounded-lg px-0.5 text-[10px] font-bold sm:text-xs ${activeView === 'calendar' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-current={activeView === 'calendar' ? 'page' : undefined} onClick={() => onNavigate('Calendar')}>Calendar</button><button className={`min-h-11 rounded-lg px-0.5 text-[10px] font-bold sm:text-xs ${activeView === 'bills' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-current={activeView === 'bills' ? 'page' : undefined} onClick={() => onNavigate('Bills')}>Bills</button><button className={`min-h-11 rounded-lg px-0.5 text-[10px] font-bold sm:text-xs ${activeView === 'reports' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-current={activeView === 'reports' ? 'page' : undefined} onClick={() => onNavigate('Reports')}>Reports</button></nav>}
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid min-h-[76px] grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden" aria-label="Mobile navigation">
        {mobileItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = (activeView === 'overview' && item.label === 'Home') || ((activeView === 'transactions' || activeView === 'recurring') && item.label === 'Activity');
          return (
            <button className={`mobile-nav-item ${active ? 'text-[var(--primary)]' : ''}`} key={item.label} type="button" aria-current={active ? 'page' : undefined} onClick={() => onNavigate(item.label)}>
              <Icon aria-hidden="true" className="size-5" /><span>{item.label}</span>
            </button>
          );
        })}
        <button className="mx-auto -mt-7 grid size-14 place-items-center self-start rounded-2xl bg-[var(--primary)] text-white shadow-[0_10px_24px_rgba(11,122,85,0.24)] transition-transform duration-200 active:scale-95" type="button" aria-label="Add transaction" onClick={onAddTransaction}>
          <Plus aria-hidden="true" className="size-6" />
        </button>
        {mobileItems.slice(2).map((item) => {
          const Icon = item.icon;
          const active = (activeView === 'accounts' && item.label === 'Accounts') || ((activeView === 'budgets' || activeView === 'savings' || activeView === 'calendar' || activeView === 'bills' || activeView === 'reports') && item.label === 'Plan');
          return (
            <button className={`mobile-nav-item ${active ? 'text-[var(--primary)]' : ''}`} key={item.label} type="button" aria-current={active ? 'page' : undefined} onClick={() => onNavigate(item.label)}>
              <Icon aria-hidden="true" className="size-5" /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
