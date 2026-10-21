# Finora Design System

## Direction

Finora should feel like calm financial control rather than accounting software. The interface uses an editorially warm foundation, precise data hierarchy, and emerald as an action and progress colour. Its signature element is the **financial pulse**: a clean cash-flow curve and month-progress marker that reappears in the dashboard, budgets, savings, and reports.

## Colour tokens

| Role | Light theme | Dark-theme intent |
|---|---:|---:|
| App background | `#F7F6F2` | `#101713` |
| Raised surface | `#FFFFFF` | `#17201B` |
| Strong text | `#17231D` | `#F5F7F5` |
| Secondary text | `#667169` | `#AAB5AE` |
| Border | `#E5E8E3` | `#2B3831` |
| Primary emerald | `#0B7A55` | `#48C995` |
| Soft emerald | `#E7F3ED` | `#17372A` |
| Positive | `#147D55` | `#48C995` |
| Warning | `#A96B16` | `#E6B45E` |
| Negative | `#BE4B4B` | `#F28B82` |
| Informative blue | `#356A9A` | `#75A7D5` |

Colour never carries meaning alone; icons, labels, signs, and progress text reinforce every status.

## Typography

- **Primary:** DM Sans, falling back to Inter and system sans-serif. UI/UX Pro Max matched this as a premium, modern and balanced SaaS typeface.
- **Wordmark:** DM Sans at a distinctive weight and spacing treatment; no separate display font is required.
- **Production type scale:** 12 px microcopy, 14 px labels and dense table metadata, 16 px body and editable fields, then 20, 24 and 32 px headings and totals.
- **Mobile baseline:** body and form text remain 16 px to preserve readability and prevent browser input zoom.
- **Weights:** 400 for body, 500 for controls and labels, 600–700 for headings and key totals.
- Financial totals and amount columns use tabular numerals.

## Spacing and shape

- 4 px base grid; primary rhythm: 8, 12, 16, 24, 32, 48 px.
- Card radius 18 px, control radius 12 px, compact chip radius 999 px.
- Borders are 1 px and quiet. Shadows are restricted to raised cards, menus, and dialogs.
- Desktop content maximum width: 1,440 px. Main reading columns stay between 640 and 840 px where practical.

## Core components

- Collapsible side navigation and mobile bottom navigation
- Search, profile menu, notification control, period selector
- Summary card, account card, budget progress, savings goal, alert strip
- Transaction table and mobile transaction row
- Filter bar and removable filter chips
- Segmented control for Expense, Income, and Transfer
- Text, amount, date, select, category picker, recurring control, file upload
- Chart frame, tooltip, legend, empty state, skeleton, inline error, toast
- Confirmation dialog and destructive-action dialog

## Interaction principles

- One clear primary action per surface.
- Important updates use 160–220 ms transitions; no looping or decorative motion.
- Add Transaction is always reachable: top action on desktop and floating action on mobile.
- Forms preserve entered values after validation errors.
- Destructive actions explain the financial impact before confirmation.
- All interactive elements support keyboard focus and touch targets of roughly 44 px.

## UI/UX Pro Max review decisions

- Use a minimal, grid-led financial dashboard rather than glassmorphism; translucency is limited to temporary overlays where contrast can be measured.
- Keep the brief's bespoke emerald palette. The database returned no exact light emerald-finance palette match, so unrelated indigo, gold and dark-mode palettes were rejected.
- Use semantic colour roles in implementation rather than raw per-component colour values.
- Mobile bottom navigation remains limited to five labelled top-level destinations. Desktop switches to the sidebar at 1,024 px and above.
- Fixed navigation reserves matching content space and mobile layout accounts for browser safe areas.
- Forms validate on blur, retain values, connect inline errors with `aria-describedby`, and show a focusable linked error summary after a failed multi-error submission.
- Trend data uses a line chart; category comparisons use sorted bars. Both provide direct values, keyboard-reachable detail and a visible data-table alternative.
- Transaction lists use stable transaction IDs and are paginated or virtualised when profiling shows long-list rendering pressure.

