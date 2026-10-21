# Finora — Stage A UI/UX Design Proposal

## 1. Product design concept

**Calm control for everyday money.** Finora combines the scanability of a modern finance dashboard with the warmth of a personal journal. It leads with the user's available balance, current-month cash flow, budget position, and next required action. Detail is progressively disclosed so a first-time user is not confronted with all 20 modules at once.

The signature visual is a restrained **financial pulse**—an emerald cash-flow curve with a clear today marker. It links the dashboard, analytics, budget pace, and savings progress without becoming decorative clutter.

## 2. Design system

The full token proposal is recorded in `DESIGN.md`. The system uses warm white and soft grey surfaces, emerald primary actions, DM Sans typography, an 8 px spacing rhythm, 18 px cards, 12 px controls, quiet borders, and shallow shadows. Statuses combine colour with text or icons.

## 3. Application navigation

- **Overview:** Dashboard
- **Money:** Transactions, Income, Expenses, Transfers
- **Accounts:** Accounts and wallets
- **Plan:** Budgets, Savings goals, Recurring transactions, Bills and reminders
- **Understand:** Reports and analytics, Transaction calendar
- **Tools:** Import/export, PDF reports
- **System:** Notifications, Settings, Theme, future authentication/profile

Desktop uses a collapsible side rail plus global search and profile controls. Mobile uses five bottom destinations—Home, Transactions, Add, Plan, and Reports—while less frequent areas remain in More.

## 4. Dashboard

The desktop hierarchy is: greeting and period control; four summary measures; cash-flow pulse with budget and savings widgets; recent transactions; upcoming bills and financial alerts. On mobile, the balance and monthly surplus lead, followed by budget pace, recent transactions, and one upcoming reminder.

## 5. Transaction management

Transactions provide global search, date range, type, category, account, amount, and status filters. Desktop uses a sortable table; mobile uses stacked rows with merchant, category, account, date, and signed amount. Bulk selection is available only on desktop. Empty results preserve filters and offer a clear reset action.

## 6. Add Transaction

The form opens as a right-side drawer on desktop and a full-screen sheet on mobile. The first decision is Expense, Income, or Transfer. Transfer replaces category with From account and To account and clearly states that it does not affect income or expense totals. Required fields are amount, account, category where applicable, and date. Optional fields are payee, note, tags, receipt, and recurrence. Amount inputs use the numeric/decimal mobile keyboard. Validation runs on blur; errors remain beside fields and a failed multi-error submission moves focus to a linked error summary. Dismissing a form with unsaved changes requires confirmation.

## 7. Budget and analytics

Budgets lead with total planned, spent, and remaining amounts, then show category progress with status labels: On track, Watch, or Over budget. Analytics uses line charts for trends and sorted horizontal bars for category comparisons. Series use direct labels or different line styles as well as colour. Every chart provides keyboard-reachable values and a matching data-table view.

## 8. States

- Loading: stable skeletons matching final layout
- Empty: explain what appears here and give one direct action
- Error: plain-language cause, retained form input, and retry path
- Success: compact toast plus updated total in context
- Confirmation: show the affected account, amount, and whether totals change
- Offline/localStorage issue: warn before data could be lost and offer export

## 9. Responsive behaviour

- **1,200 px and above:** expanded sidebar, four summary cards, two-column analytical workspace.
- **768–1,199 px:** compact icon rail, two-column cards, reduced chart annotations.
- **Below 768 px:** five-item labelled bottom navigation, single-column cards, full-screen forms, transaction rows instead of tables, floating Add action, safe-area padding and 16 px form text.
- Charts redraw to container width; legends wrap; non-essential axis labels reduce. Controls never require horizontal page scrolling.
- Back navigation restores the previous scroll position, filters and form state. Fixed navigation always reserves equivalent content space.

## 10. Prioritised frontend development plan

1. **Foundation:** project setup, design tokens, accessibility baseline, money/date utilities, data models, mock-data and storage interfaces.
2. **Core shell:** responsive navigation, search, theme, notifications, reusable states and dialogs.
3. **Transaction engine:** income, expense, transfer, filters, validation, account reconciliation, localStorage persistence.
4. **Daily overview:** dashboard, accounts, recent activity, budget and savings widgets.
5. **Planning:** budgets, savings goals, recurring entries, bills and reminders.
6. **Insights and tools:** analytics, calendar, CSV import/export, PDF reports.
7. **Hardening:** responsive QA at 375, 768, 1,024 and 1,440 px; keyboard and screen-reader checks; reduced-motion and dark-theme testing; error paths; calculation tests; profiling; pagination or virtualisation for long transaction lists; and final consistency review.

Each phase should finish with working tests and a review checkpoint before the next phase begins.
