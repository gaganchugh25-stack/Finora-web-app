# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Vite, Tailwind CSS, Lucide icons, and Recharts. Frontend-only prototype with a separate mock-data layer and browser localStorage persistence. No backend, database, authentication integration, or deployment configuration is included at this stage.

## Users

Individuals managing their own income, expenses, accounts, budgets, bills, savings goals, and recurring transactions across desktop, tablet, and mobile browsers.

## Product Purpose

Finora gives a person one clear place to record money movement, understand current financial position, control spending, plan budgets, and track savings progress. Success means totals reconcile across screens and the user can understand and act on their financial position without spreadsheet-level effort.

## Operating Context

The product supports frequent transaction entry, account-to-account transfers, periodic budget review, bill reminders, recurring entries, transaction search, CSV import and export, and PDF reporting. Currency examples use INR unless the user later chooses another currency in settings.

## Capabilities and Constraints

- Overview dashboard, income, expenses, transaction history, accounts and wallets, transfers, categories, budgets, savings goals, recurring transactions, bills and reminders, reports, calendar, import and export, settings, advanced filters, themes, and notifications.
- Future authentication screens are designed but not connected.
- Monetary amounts must avoid floating-point errors.
- Transfers must not count as income or expense.
- Account balances must reconcile with transactions.
- Budget calculations must use the correct category and date filters.
- Recurring entries must prevent duplicates.
- All financial totals must remain consistent across screens.
- Design approval is required before frontend development begins.

## Brand Commitments

Working product name: Finora. The visual direction is a premium, modern financial SaaS experience with a light-first theme, warm white and soft grey surfaces, emerald accents, elegant typography, balanced whitespace, rounded cards, subtle shadows, clean icons, restrained motion, and accessible contrast.

## Evidence on Hand

No customer research, production data, legal copy, testimonials, or existing brand assets were supplied. Stage A mockups therefore use clearly illustrative personal-finance data and make no commercial or performance claims.

## Product Principles

- Make the financial position understandable at a glance.
- Keep recording money quick, forgiving, and easy to verify.
- Preserve accounting consistency across every view.
- Reveal detail progressively instead of overwhelming the user.
- Design mobile entry and desktop review as equally important workflows.

## Accessibility & Inclusion

The interface must maintain readable contrast, clear focus states, keyboard access, semantic controls, touch targets of roughly 44 px, text that remains legible at mobile sizes, and states that do not rely on colour alone.
