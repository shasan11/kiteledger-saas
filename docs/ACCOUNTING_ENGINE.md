# Accounting Engine

How money moves through KiteLedger, and the rules the posting layer enforces.

## Inventory costing: perpetual

Stock-tracked products capitalise on purchase and are expensed when sold.

| Event | Entry |
| --- | --- |
| Purchase bill (tracked product) | Dr **Inventory** / Cr Accounts Payable |
| Purchase bill (service, non-tracked) | Dr Purchase Expense / Cr Accounts Payable |
| Sales invoice | Dr Accounts Receivable / Cr Sales Income (+ Cr Tax Payable) |
| Stock leaving on that invoice | Dr **Cost of Goods Sold** / Cr Inventory, at weighted-average cost |
| Manual adjustment (shrinkage) | Dr Inventory Adjustment Loss / Cr Inventory |

`Product::track_inventory` decides which purchase treatment applies.

**Adjustments that deliberately post nothing.** An `InventoryAdjustment` whose
`source_type` is `purchase_bill`, `purchase_bill_reversal` or
`production_journal` raises no journal of its own — the parent document already
books the value, and posting again would double-count. See
`ParallelJournalVoucherService::ADJUSTMENT_SOURCES_WITHOUT_OWN_JOURNAL`.

**Switching an existing tenant over.** Stock bought before the changeover was
expensed and never reached the Inventory account. Post the catch-up entry once:

```bash
php artisan tenants:run kiteledger:post-opening-inventory --dry-run
php artisan tenants:run kiteledger:post-opening-inventory
```

It posts `Dr Inventory / Cr Purchase Expense` for the stock currently on hand and
refuses to run twice without `--force`.

## Account resolution

`AccountingAccountResolverService` maps a posting role (`accounts_receivable`,
`cost_of_goods_sold`, …) to a chart account by trying each code **in order**,
then each name. Order matters: `accounts_receivable` is `['1130', '1100']`, so a
chart with both resolves to Accounts Receivable and only falls back to the
Current Assets header when 1130 is absent.

Resolved ids are cached for an hour. **Bump `RESOLUTION_VERSION` when changing
the mapping** — the version is part of the cache key, so a deploy invalidates
stale ids without anyone running `cache:clear`.

A missing account raises `MissingLedgerAccountException`, distinct from other
posting failures so callers that must not be blocked by incomplete setup (stock
movement) can degrade gracefully while genuine journal errors still fail loudly.

**Contact overrides.** A contact may point at its own receivable/payable control
account, but the override is rejected unless it is on the right side of the
balance sheet and is not a treasury account. Without that check a contact wired
to a bank account silently books unpaid credit sales as banked cash.

## Posting rules

- **Balanced to the cent.** Debits and credits are compared as integer cents, not
  floats with a tolerance.
- **No negative amounts.** Post on the opposite side instead. Two negative lines
  can "balance" while representing nothing.
- **Rounding is capped.** `balanceRoundingDifference()` absorbs at most one cent
  per line (minimum 0.05) into the largest line on the deficient side. A larger
  gap is a calculation error and throws rather than being folded into a real
  account.
- **Closed periods are enforced.** `FiscalPeriodGuard` runs inside
  `createJournal()`, the single choke point for automatic postings. A fiscal year
  with `status = CLOSED`, or a date on or before its `lock_date`, refuses the
  posting. Dates that no fiscal year covers are allowed, so tenants that never
  configured fiscal years are unaffected.

## Voiding

Behaviour depends on whether the original period is still open:

- **Open period** — the voucher is voided in place (`void = true`,
  `status = cancelled`) and its balance effect removed. Nothing has been reported
  from that period yet, so there is nothing to preserve.
- **Closed or locked period** — the original is left untouched and a mirror-image
  voucher is posted in the current open period, with debits and credits swapped
  (never negated). The pair is linked by `reversed_journal_voucher_id`, and the
  original records `reversed_at` / `reversal_reason`. The two net to zero across
  periods and both halves stay visible.

## Reporting

Report queries must exclude drafts, unapproved and voided documents. For queries
built on `journal_voucher_lines` the status columns live on the **header**, so
pass the table explicitly:

```php
$this->applyStatusApprovalFilters($query, $filters, 'journal_vouchers');
```

Omitting it means the guards find no columns and silently pass everything
through — voided vouchers included.

**Aggregates must not be appended to a wildcard select.** `select('t.*')` plus
`selectRaw('SUM(...)')` with no `GROUP BY` runs fine on SQLite and is a hard
error on MySQL under `ONLY_FULL_GROUP_BY`, which is active because every
connection sets `'strict' => true`. Use `select(DB::raw(...))` so the aggregate
*replaces* the projection. The test suite runs SQLite, so this is guarded
structurally in `AccountingCorrectnessTest`.

**Balance sheet.** Liabilities and equity are presented credit-positive, and a
*Current Period Earnings* row carries the net result of income and expense into
equity. Nothing closes those accounts otherwise, so without it A = L + E never
holds. There is still no year-end closing entry into Retained Earnings.

## Known gaps

- `journal_voucher_lines` carries both `account_id` and `chart_of_account_id`
  from an unfinished migration; postings write the former and reports join on the
  latter. The model keeps the pair in step on save, but the duplication remains.
- Tax sub-types (VAT/GST/TDS) all resolve to the single `1150` / `2120` control
  accounts.
