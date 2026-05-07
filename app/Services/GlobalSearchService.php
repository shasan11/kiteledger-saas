<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\CashTransfer;
use App\Models\ChartOfAccount;
use App\Models\ChequeRegister;
use App\Models\Contact;
use App\Models\CrmActivity;
use App\Models\Currency;
use App\Models\CustomerPayment;
use App\Models\Deal;
use App\Models\DebitNote;
use App\Models\DocumentNumbering;
use App\Models\Expense;
use App\Models\InventoryAdjustment;
use App\Models\Invoice;
use App\Models\JournalVoucher;
use App\Models\Lead;
use App\Models\LeaveApplication;
use App\Models\LoanAccount;
use App\Models\Milestone;
use App\Models\Payslip;
use App\Models\PosReturn;
use App\Models\PosSale;
use App\Models\PosShift;
use App\Models\PosTerminal;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Project;
use App\Models\ProformaInvoice;
use App\Models\PurchaseBill;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\SalesReturn;
use App\Models\SupplierPayment;
use App\Models\Task;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WarehouseTransfer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class GlobalSearchService
{
    protected array $columnCache = [];

    public function search(Request $request, array $filters): array
    {
        $user = $request->user();
        abort_unless($user, 401);

        $query = trim((string) ($filters['q'] ?? ''));
        $limit = min((int) ($filters['limit'] ?? 5), 5);
        $modules = array_values(array_unique($filters['modules'] ?? []));
        $branchScope = $this->resolveBranchScope($request, $filters);
        $groups = [];
        $total = 0;

        foreach ($this->moduleDefinitions() as $groupDefinition) {
            if ($modules !== [] && !in_array($groupDefinition['key'], $modules, true)) {
                continue;
            }

            $items = [];

            foreach ($groupDefinition['searches'] as $definition) {
                if (!$this->canSearchDefinition($user, $definition)) {
                    continue;
                }

                $results = $definition['static'] ?? false
                    ? $this->searchStaticDefinition($definition, $query, $branchScope)
                    : $this->searchModelDefinition($definition, $query, $limit, $branchScope);

                foreach ($results as $result) {
                    $items[] = $result;
                    $total++;

                    if ($total >= 50) {
                        break 3;
                    }
                }
            }

            if ($items !== []) {
                $groups[] = [
                    'module' => $groupDefinition['module'],
                    'key' => $groupDefinition['key'],
                    'items' => array_slice($items, 0, 50 - ($total - count($items))),
                ];
            }
        }

        return [
            'query' => $query,
            'groups' => $groups,
        ];
    }

    protected function searchModelDefinition(array $definition, string $term, int $limit, array $branchScope): array
    {
        $modelClass = $definition['model'];
        /** @var Model $model */
        $model = new $modelClass();

        $query = $modelClass::query()->limit($limit);

        if (!empty($definition['with'])) {
            $query->with($definition['with']);
        }

        $this->applyBranchScope($query, $model, $branchScope, $definition);
        $this->applyActiveScope($query, $model, $definition);
        $this->applySearchConditions($query, $model, $term, $definition['search']);
        $this->applyPriorityOrdering($query, $model, $term, $definition);

        return $query
            ->get()
            ->map(fn (Model $record) => $this->mapResult($record, $definition, $branchScope))
            ->filter()
            ->values()
            ->all();
    }

    protected function searchStaticDefinition(array $definition, string $term, array $branchScope): array
    {
        $normalized = Str::lower($term);

        return collect($definition['items'])
            ->filter(function (array $item) use ($normalized) {
                return Str::contains(
                    Str::lower($item['title'] . ' ' . $item['subtitle']),
                    $normalized
                );
            })
            ->take(5)
            ->map(function (array $item) use ($definition, $branchScope) {
                return [
                    'module' => $definition['group'],
                    'type' => $definition['type'],
                    'title' => $item['title'],
                    'subtitle' => $item['subtitle'],
                    'url' => $item['url'],
                    'status' => null,
                    'date' => null,
                    'branch' => $branchScope['show_branch'] ? ($item['branch'] ?? null) : null,
                ];
            })
            ->values()
            ->all();
    }

    protected function mapResult(Model $record, array $definition, array $branchScope): ?array
    {
        $title = trim((string) value($definition['title'], $record, $this));

        if ($title === '') {
            return null;
        }

        return [
            'module' => $definition['group'],
            'type' => $definition['type'],
            'title' => $title,
            'subtitle' => trim((string) value($definition['subtitle'], $record, $this)),
            'url' => value($definition['url'], $record, $this),
            'status' => value($definition['status'] ?? null, $record, $this),
            'date' => value($definition['date'] ?? null, $record, $this),
            'branch' => $branchScope['show_branch'] ? $this->branchName($record) : null,
        ];
    }

    protected function applySearchConditions(Builder $query, Model $model, string $term, array $fields): void
    {
        $needle = '%' . str_replace(' ', '%', trim($term)) . '%';

        $query->where(function (Builder $builder) use ($model, $needle, $fields) {
            foreach ($fields as $field) {
                if (Str::contains($field, '.')) {
                    $segments = explode('.', $field);
                    $column = array_pop($segments);
                    $relation = implode('.', $segments);
                    $rootRelation = $segments[0] ?? null;

                    if ($rootRelation && method_exists($model, $rootRelation)) {
                        $builder->orWhereHas($relation, function (Builder $relationQuery) use ($column, $needle) {
                            $relationQuery->where($column, 'like', $needle);
                        });
                    }

                    continue;
                }

                if ($this->hasColumn($model->getTable(), $field)) {
                    $builder->orWhere($field, 'like', $needle);
                }
            }
        });
    }

    protected function applyPriorityOrdering(Builder $query, Model $model, string $term, array $definition): void
    {
        $priorityFields = $definition['priority'] ?? [];
        $table = $model->getTable();
        $normalized = Str::lower($term);

        foreach ($priorityFields as $field) {
            if (!$this->hasColumn($table, $field)) {
                continue;
            }

            $query->orderByRaw(
                "case
                    when lower({$field}) = ? then 0
                    when lower({$field}) like ? then 1
                    when lower({$field}) like ? then 2
                    else 3
                end",
                [$normalized, $normalized . '%', '%' . $normalized . '%']
            );
        }

        if ($this->hasColumn($table, 'created_at')) {
            $query->orderByDesc('created_at');
        }
    }

    protected function applyActiveScope(Builder $query, Model $model, array $definition): void
    {
        if (($definition['skip_active_scope'] ?? false) === true) {
            return;
        }

        if ($this->hasColumn($model->getTable(), 'active')) {
            $query->where('active', true);
        }
    }

    protected function applyBranchScope(Builder $query, Model $model, array $scope, array $definition): void
    {
        if (($definition['branch_aware'] ?? null) === false) {
            return;
        }

        if (!$this->hasColumn($model->getTable(), 'branch_id')) {
            return;
        }

        if ($scope['mode'] === 'all') {
            return;
        }

        if ($scope['mode'] === 'selected' && $scope['selected_branch_id']) {
            $query->where('branch_id', $scope['selected_branch_id']);
            return;
        }

        $query->whereIn('branch_id', $scope['accessible_branch_ids']);
    }

    protected function resolveBranchScope(Request $request, array $filters): array
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $requestedBranchId = $filters['branch_id'] ?? null;
        $canViewAll = $this->canViewAllBranches($user);

        if ($requestedBranchId && in_array($requestedBranchId, ['all', '*'], true)) {
            abort_unless($canViewAll, 403, 'You do not have access to all branches.');

            return [
                'mode' => 'all',
                'selected_branch_id' => null,
                'accessible_branch_ids' => $accessibleBranchIds,
                'show_branch' => true,
            ];
        }

        if ($requestedBranchId) {
            if ($canViewAll) {
                abort_unless(Branch::query()->whereKey($requestedBranchId)->exists(), 403, 'Invalid branch selected.');

                return [
                    'mode' => 'selected',
                    'selected_branch_id' => $requestedBranchId,
                    'accessible_branch_ids' => $accessibleBranchIds,
                    'show_branch' => false,
                ];
            }

            abort_unless(
                in_array((string) $requestedBranchId, $accessibleBranchIds, true),
                403,
                'You do not have access to this branch.'
            );

            return [
                'mode' => 'selected',
                'selected_branch_id' => (string) $requestedBranchId,
                'accessible_branch_ids' => $accessibleBranchIds,
                'show_branch' => false,
            ];
        }

        $defaultBranchId = !empty($user?->current_branch_id)
            ? (string) $user->current_branch_id
            : (!empty($user?->branch_id) ? (string) $user->branch_id : ($accessibleBranchIds[0] ?? null));

        return [
            'mode' => 'selected',
            'selected_branch_id' => $defaultBranchId,
            'accessible_branch_ids' => $accessibleBranchIds,
            'show_branch' => false,
        ];
    }

    protected function accessibleBranchIds(?User $user): array
    {
        if (!$user) {
            return [];
        }

        $ids = [];

        if (!empty($user->current_branch_id)) {
            $ids[] = (string) $user->current_branch_id;
        }

        if (!empty($user->branch_id)) {
            $ids[] = (string) $user->branch_id;
        }

        if (!empty($user->branch_ids) && is_array($user->branch_ids)) {
            foreach ($user->branch_ids as $branchId) {
                if ($branchId) {
                    $ids[] = (string) $branchId;
                }
            }
        }

        try {
            if (method_exists($user, 'branches')) {
                foreach ($user->branches()->pluck('branches.id')->all() as $branchId) {
                    if ($branchId) {
                        $ids[] = (string) $branchId;
                    }
                }
            }
        } catch (\Throwable) {
            //
        }

        $ids = array_values(array_unique(array_filter($ids)));

        if ($ids !== []) {
            return $ids;
        }

        $fallback = Branch::query()->orderByDesc('is_head_office')->value('id');

        return $fallback ? [(string) $fallback] : [];
    }

    protected function canViewAllBranches(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        try {
            return $user->can('branch.view_all');
        } catch (\Throwable) {
            return false;
        }
    }

    protected function canSearchDefinition(User $user, array $definition): bool
    {
        foreach (($definition['permissions'] ?? []) as $permission) {
            try {
                if ($user->can($permission)) {
                    return true;
                }
            } catch (\Throwable) {
                //
            }
        }

        return empty($definition['permissions']);
    }

    protected function hasColumn(string $table, string $column): bool
    {
        if (!isset($this->columnCache[$table])) {
            $this->columnCache[$table] = array_flip(Schema::getColumnListing($table));
        }

        return isset($this->columnCache[$table][$column]);
    }

    protected function branchName(Model $record): ?string
    {
        $branch = $record->getRelationValue('branch');

        if ($branch instanceof Branch) {
            return $branch->name;
        }

        if ($record->getAttribute('branch_id')) {
            return Branch::query()->whereKey($record->getAttribute('branch_id'))->value('name');
        }

        return null;
    }

    protected function formatMoney($amount): ?string
    {
        if ($amount === null || $amount === '') {
            return null;
        }

        return 'Rs. ' . number_format((float) $amount, 2);
    }

    protected function statusLabel(?string $status): ?string
    {
        if (!$status) {
            return null;
        }

        return Str::title(str_replace('_', ' ', $status));
    }

    protected function subtitle(array $parts): string
    {
        return implode(' · ', array_values(array_filter($parts, fn ($part) => filled($part))));
    }

    protected function reportUrl(string $group, string $title): string
    {
        return '/reports/' . $this->slugify($group) . '/' . $this->slugify($title);
    }

    protected function slugify(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replace('&', 'and')
            ->replace(['(', ')'], '')
            ->slug('-')
            ->value();
    }

    protected function moduleDefinitions(): array
    {
        return [
            [
                'key' => 'master',
                'module' => 'Master / Setup',
                'searches' => [
                    [
                        'group' => 'Master / Setup',
                        'type' => 'branch',
                        'model' => Branch::class,
                        'permissions' => ['branch.view', 'settings.branches.manage'],
                        'search' => ['code', 'name', 'email', 'phone', 'address'],
                        'priority' => ['code', 'name'],
                        'with' => [],
                        'branch_aware' => false,
                        'title' => fn (Branch $record) => $record->name,
                        'subtitle' => fn (Branch $record) => $this->subtitle([$record->code, $record->address]),
                        'url' => fn () => '/settings/branches',
                        'status' => fn (Branch $record) => $record->active ? null : 'inactive',
                    ],
                    [
                        'group' => 'Master / Setup',
                        'type' => 'currency',
                        'model' => Currency::class,
                        'permissions' => ['system.settings.view', 'settings.currencies.manage'],
                        'search' => ['code', 'name', 'symbol'],
                        'priority' => ['code', 'name'],
                        'branch_aware' => false,
                        'title' => fn (Currency $record) => $record->name,
                        'subtitle' => fn (Currency $record) => $this->subtitle([$record->code, $record->symbol ? 'Symbol: ' . $record->symbol : null]),
                        'url' => fn () => '/settings/currencies',
                        'status' => fn (Currency $record) => $record->active ? null : 'inactive',
                    ],
                    [
                        'group' => 'Master / Setup',
                        'type' => 'document_numbering',
                        'model' => DocumentNumbering::class,
                        'permissions' => ['system.document_numbering.manage', 'settings.document-series.manage'],
                        'search' => ['document_type', 'prefix'],
                        'priority' => ['document_type', 'prefix'],
                        'branch_aware' => false,
                        'title' => fn (DocumentNumbering $record) => Str::title(str_replace('_', ' ', $record->document_type)),
                        'subtitle' => fn (DocumentNumbering $record) => $this->subtitle([
                            $record->prefix ? 'Prefix: ' . $record->prefix : null,
                            $record->next_number ? 'Next: ' . $record->next_number : null,
                        ]),
                        'url' => fn () => '/settings/document-numberings',
                        'status' => fn (DocumentNumbering $record) => $record->active ? null : 'inactive',
                    ],
                ],
            ],
            [
                'key' => 'crm',
                'module' => 'Contacts / CRM',
                'searches' => [
                    [
                        'group' => 'Contacts / CRM',
                        'type' => 'contact',
                        'model' => Contact::class,
                        'permissions' => ['contact.view', 'crm.contacts.view'],
                        'search' => ['name', 'code', 'phone', 'email', 'pan', 'tax_registration_no'],
                        'priority' => ['code', 'name', 'phone', 'email'],
                        'branch_aware' => false,
                        'title' => fn (Contact $record) => $record->name,
                        'subtitle' => fn (Contact $record) => $this->subtitle([
                            Str::title($record->contact_type ?: 'contact'),
                            $record->phone,
                            $record->pan ? 'PAN: ' . $record->pan : null,
                        ]),
                        'url' => fn (Contact $record) => '/crm/contacts/' . $record->id,
                        'status' => fn (Contact $record) => $record->contact_type,
                    ],
                    [
                        'group' => 'Contacts / CRM',
                        'type' => 'lead',
                        'model' => Lead::class,
                        'permissions' => ['crm.lead.view'],
                        'search' => ['lead_no', 'name', 'company_name', 'email', 'phone', 'mobile', 'status'],
                        'priority' => ['lead_no', 'name', 'company_name'],
                        'branch_aware' => false,
                        'title' => fn (Lead $record) => $record->name ?: $record->lead_no,
                        'subtitle' => fn (Lead $record) => $this->subtitle([
                            $record->lead_no,
                            $record->company_name,
                            $record->phone ?: $record->mobile,
                        ]),
                        'url' => fn (Lead $record) => '/crm/leads/' . $record->id,
                        'status' => fn (Lead $record) => $record->status,
                        'date' => fn (Lead $record) => optional($record->next_follow_up_date)->toDateString(),
                    ],
                    [
                        'group' => 'Contacts / CRM',
                        'type' => 'deal',
                        'model' => Deal::class,
                        'permissions' => ['crm.deal.view'],
                        'search' => ['deal_no', 'title', 'source', 'status'],
                        'priority' => ['deal_no', 'title', 'source'],
                        'with' => ['contact'],
                        'branch_aware' => false,
                        'title' => fn (Deal $record) => $record->title ?: $record->deal_no,
                        'subtitle' => fn (Deal $record) => $this->subtitle([
                            $record->deal_no,
                            optional($record->contact)->name,
                            $record->source,
                        ]),
                        'url' => fn () => '/crm/deals',
                        'status' => fn (Deal $record) => $record->status,
                        'date' => fn (Deal $record) => optional($record->expected_close_date)->toDateString(),
                    ],
                    [
                        'group' => 'Contacts / CRM',
                        'type' => 'activity',
                        'model' => CrmActivity::class,
                        'permissions' => ['crm.activity.view'],
                        'search' => ['subject', 'activity_type', 'status'],
                        'priority' => ['subject', 'activity_type'],
                        'with' => ['contact', 'deal'],
                        'branch_aware' => false,
                        'title' => fn (CrmActivity $record) => $record->subject,
                        'subtitle' => fn (CrmActivity $record) => $this->subtitle([
                            Str::title(str_replace('_', ' ', $record->activity_type ?: 'activity')),
                            optional($record->contact)->name ?: optional($record->deal)->title,
                            $record->outcome,
                        ]),
                        'url' => fn (CrmActivity $record) => '/crm/activities/' . $record->id,
                        'status' => fn (CrmActivity $record) => $record->status,
                        'date' => fn (CrmActivity $record) => optional($record->due_at)->toDateString(),
                    ],
                ],
            ],
            [
                'key' => 'accounting',
                'module' => 'Accounting',
                'searches' => [
                    [
                        'group' => 'Accounting',
                        'type' => 'chart_of_account',
                        'model' => ChartOfAccount::class,
                        'permissions' => ['accounting.chart_of_accounts.view'],
                        'search' => ['code', 'name', 'account_type'],
                        'priority' => ['code', 'name'],
                        'with' => ['branch'],
                        'title' => fn (ChartOfAccount $record) => $record->name,
                        'subtitle' => fn (ChartOfAccount $record) => $this->subtitle([$record->code, Str::title(str_replace('_', ' ', $record->account_type ?: ''))]),
                        'url' => fn (ChartOfAccount $record) => '/accounting/chart-of-accounts/' . $record->id,
                        'status' => fn (ChartOfAccount $record) => $record->active ? null : 'inactive',
                    ],
                    [
                        'group' => 'Accounting',
                        'type' => 'bank_account',
                        'model' => BankAccount::class,
                        'permissions' => ['accounting.bank_accounts.view'],
                        'search' => ['display_name', 'code', 'bank_name', 'account_name', 'account_number'],
                        'priority' => ['code', 'display_name', 'account_number'],
                        'with' => ['branch'],
                        'title' => fn (BankAccount $record) => $record->display_name,
                        'subtitle' => fn (BankAccount $record) => $this->subtitle([$record->code, $record->bank_name, $record->account_number]),
                        'url' => fn (BankAccount $record) => '/accounting/bank-accounts/' . $record->id,
                    ],
                    [
                        'group' => 'Accounting',
                        'type' => 'journal_voucher',
                        'model' => JournalVoucher::class,
                        'permissions' => ['accounting.journal_voucher.view'],
                        'search' => ['voucher_no', 'reference', 'narration', 'status'],
                        'priority' => ['voucher_no', 'reference'],
                        'with' => ['branch'],
                        'title' => fn (JournalVoucher $record) => $record->voucher_no,
                        'subtitle' => fn (JournalVoucher $record) => $this->subtitle([
                            Str::limit($record->narration ?: $record->reference, 70),
                            $this->formatMoney($record->total),
                            $this->statusLabel($record->status),
                        ]),
                        'url' => fn (JournalVoucher $record) => '/accounting/journal-vouchers/' . $record->id,
                        'status' => fn (JournalVoucher $record) => $record->status,
                        'date' => fn (JournalVoucher $record) => optional($record->voucher_date)->toDateString(),
                    ],
                    [
                        'group' => 'Accounting',
                        'type' => 'cash_transfer',
                        'model' => CashTransfer::class,
                        'permissions' => ['accounting.cash_transfer.view'],
                        'search' => ['transfer_no', 'reference', 'notes', 'status'],
                        'priority' => ['transfer_no', 'reference'],
                        'with' => ['branch'],
                        'title' => fn (CashTransfer $record) => $record->transfer_no,
                        'subtitle' => fn (CashTransfer $record) => $this->subtitle([
                            Str::limit($record->reference ?: $record->notes, 70),
                            $this->formatMoney($record->total_amount ?: $record->total),
                            $this->statusLabel($record->status),
                        ]),
                        'url' => fn (CashTransfer $record) => '/accounting/cash-transfers/' . $record->id,
                        'status' => fn (CashTransfer $record) => $record->status,
                        'date' => fn (CashTransfer $record) => optional($record->transfer_date)->toDateString(),
                    ],
                    [
                        'group' => 'Accounting',
                        'type' => 'cheque_register',
                        'model' => ChequeRegister::class,
                        'permissions' => ['accounting.cheque_register.view'],
                        'search' => ['cheque_no', 'payee_name', 'status', 'notes'],
                        'priority' => ['cheque_no', 'payee_name'],
                        'with' => ['branch'],
                        'title' => fn (ChequeRegister $record) => $record->cheque_no,
                        'subtitle' => fn (ChequeRegister $record) => $this->subtitle([$record->payee_name, $this->formatMoney($record->amount), $record->notes]),
                        'url' => fn () => '/accounting/cheque-registers',
                        'status' => fn (ChequeRegister $record) => $record->status,
                        'date' => fn (ChequeRegister $record) => optional($record->cheque_date)->toDateString(),
                    ],
                    [
                        'group' => 'Accounting',
                        'type' => 'loan_account',
                        'model' => LoanAccount::class,
                        'permissions' => ['accounting.loan_account.view'],
                        'search' => ['name', 'bank_name', 'loan_number', 'status'],
                        'priority' => ['loan_number', 'name', 'bank_name'],
                        'branch_aware' => false,
                        'title' => fn (LoanAccount $record) => $record->name,
                        'subtitle' => fn (LoanAccount $record) => $this->subtitle([$record->bank_name, $record->loan_number, $this->formatMoney($record->current_balance)]),
                        'url' => fn (LoanAccount $record) => '/accounting/loan-accounts/' . $record->id,
                        'status' => fn (LoanAccount $record) => $record->status,
                        'date' => fn (LoanAccount $record) => optional($record->balance_as_of)->toDateString(),
                    ],
                ],
            ],
            [
                'key' => 'sales',
                'module' => 'Sales / Payment In',
                'searches' => [
                    $this->documentDefinition('Sales / Payment In', 'quotation', Quotation::class, ['sales.quotation.view'], ['quotation_no', 'notes', 'status', 'contact.name'], ['branch', 'contact'], '/payment-in/quotations/', fn (Quotation $record) => $record->quotation_no, fn (Quotation $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->total), $this->statusLabel($record->status)]), 'quotation_date'),
                    $this->documentDefinition('Sales / Payment In', 'sales_order', SalesOrder::class, ['sales.sales_order.view'], ['sales_order_no', 'reference', 'status', 'contact.name'], ['branch', 'contact'], '/payment-in/sales-orders/', fn (SalesOrder $record) => $record->sales_order_no, fn (SalesOrder $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->grand_total ?: $record->total), $this->statusLabel($record->status)]), 'sales_order_date'),
                    $this->documentDefinition('Sales / Payment In', 'proforma_invoice', ProformaInvoice::class, ['sales.proforma_invoice.view'], ['proforma_no', 'reference', 'status', 'contact.name'], ['branch', 'contact'], '/payment-in/proforma-invoices/', fn (ProformaInvoice $record) => $record->proforma_no, fn (ProformaInvoice $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->total), $this->statusLabel($record->status)]), 'proforma_date'),
                    $this->documentDefinition('Sales / Payment In', 'invoice', Invoice::class, ['sales.invoice.view'], ['invoice_no', 'reference', 'status', 'contact.name'], ['branch', 'contact'], '/payment-in/invoices/', fn (Invoice $record) => $record->invoice_no, fn (Invoice $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->total), $this->statusLabel($record->status)]), 'invoice_date'),
                    $this->documentDefinition('Sales / Payment In', 'customer_payment', CustomerPayment::class, ['sales.customer_payment.view'], ['payment_no', 'reference', 'payment_method', 'status', 'contact.name'], ['branch', 'contact'], '/payment-in/payments/', fn (CustomerPayment $record) => $record->payment_no, fn (CustomerPayment $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->amount), $this->statusLabel($record->status)]), 'payment_date'),
                    $this->documentDefinition('Sales / Payment In', 'credit_note', SalesReturn::class, ['sales.credit_note.view'], ['sales_return_no', 'reference', 'status', 'contact.name'], ['branch', 'contact'], '/payment-in/credit-notes/', fn (SalesReturn $record) => $record->sales_return_no, fn (SalesReturn $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->total), $this->statusLabel($record->status)]), 'sales_return_date'),
                ],
            ],
            [
                'key' => 'purchase',
                'module' => 'Purchase / Payment Out',
                'searches' => [
                    $this->documentDefinition('Purchase / Payment Out', 'purchase_order', PurchaseOrder::class, ['purchase.purchase_order.view'], ['purchase_order_no', 'status', 'contact.name', 'notes'], ['branch', 'contact'], '/payment-out/purchase-orders/', fn (PurchaseOrder $record) => $record->purchase_order_no, fn (PurchaseOrder $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->total), $this->statusLabel($record->status)]), 'purchase_order_date'),
                    $this->documentDefinition('Purchase / Payment Out', 'purchase_bill', PurchaseBill::class, ['purchase.purchase_bill.view'], ['bill_no', 'reference', 'status', 'contact.name'], ['branch', 'contact'], '/payment-out/purchase-bills/', fn (PurchaseBill $record) => $record->bill_no, fn (PurchaseBill $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->total), $this->statusLabel($record->status)]), 'bill_date'),
                    $this->documentDefinition('Purchase / Payment Out', 'expense', Expense::class, ['purchase.expense.view'], ['expense_no', 'reference', 'status', 'contact.name'], ['branch', 'contact'], '/payment-out/expenses/', fn (Expense $record) => $record->expense_no, fn (Expense $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->total), $this->statusLabel($record->status)]), 'expense_date'),
                    $this->documentDefinition('Purchase / Payment Out', 'debit_note', DebitNote::class, ['purchase.debit_note.view'], ['debit_note_no', 'reference', 'status', 'contact.name'], ['branch', 'contact'], '/payment-out/debit-notes/', fn (DebitNote $record) => $record->debit_note_no, fn (DebitNote $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->total), $this->statusLabel($record->status)]), 'debit_note_date'),
                    $this->documentDefinition('Purchase / Payment Out', 'supplier_payment', SupplierPayment::class, ['purchase.supplier_payment.view'], ['payment_no', 'reference', 'method', 'status', 'contact.name'], ['branch', 'contact'], '/payment-out/payments/', fn (SupplierPayment $record) => $record->payment_no, fn (SupplierPayment $record) => $this->subtitle([optional($record->contact)->name, $this->formatMoney($record->amount), $this->statusLabel($record->status)]), 'payment_date'),
                ],
            ],
            [
                'key' => 'inventory',
                'module' => 'Inventory / Warehouse',
                'searches' => [
                    [
                        'group' => 'Inventory / Warehouse',
                        'type' => 'product',
                        'model' => Product::class,
                        'permissions' => ['inventory.product.view'],
                        'search' => ['name', 'code', 'sku', 'barcode', 'description'],
                        'priority' => ['code', 'sku', 'barcode', 'name'],
                        'with' => ['branch'],
                        'title' => fn (Product $record) => $record->name,
                        'subtitle' => fn (Product $record) => $this->subtitle([
                            $record->sku ? 'SKU: ' . $record->sku : null,
                            $record->barcode ? 'Barcode: ' . $record->barcode : null,
                            $record->code ? 'Code: ' . $record->code : null,
                        ]),
                        'url' => fn (Product $record) => '/inventory/products/' . $record->id,
                        'status' => fn (Product $record) => $record->active ? null : 'inactive',
                    ],
                    [
                        'group' => 'Inventory / Warehouse',
                        'type' => 'product_category',
                        'model' => ProductCategory::class,
                        'permissions' => ['inventory.product_category.manage'],
                        'search' => ['name', 'description'],
                        'priority' => ['name'],
                        'branch_aware' => false,
                        'title' => fn (ProductCategory $record) => $record->name,
                        'subtitle' => fn (ProductCategory $record) => Str::limit((string) $record->description, 80),
                        'url' => fn () => '/inventory/product-categories',
                    ],
                    [
                        'group' => 'Inventory / Warehouse',
                        'type' => 'warehouse',
                        'model' => Warehouse::class,
                        'permissions' => ['inventory.warehouse.view'],
                        'search' => ['code', 'name', 'address'],
                        'priority' => ['code', 'name'],
                        'with' => ['branch'],
                        'title' => fn (Warehouse $record) => $record->name,
                        'subtitle' => fn (Warehouse $record) => $this->subtitle([$record->code, $record->address]),
                        'url' => fn (Warehouse $record) => '/warehouse/' . $record->id,
                    ],
                    $this->documentDefinition('Inventory / Warehouse', 'warehouse_transfer', WarehouseTransfer::class, ['inventory.warehouse_transfer.view'], ['transfer_no', 'notes', 'status'], ['branch'], '/inventory/warehouse-transfers/', fn (WarehouseTransfer $record) => $record->transfer_no, fn (WarehouseTransfer $record) => $this->subtitle([$record->notes, $this->statusLabel($record->status)]), 'transfer_date'),
                    $this->documentDefinition('Inventory / Warehouse', 'inventory_adjustment', InventoryAdjustment::class, ['inventory.adjustment.view'], ['adjustment_no', 'reason', 'notes', 'status'], ['branch'], '/inventory/adjustments/', fn (InventoryAdjustment $record) => $record->adjustment_no, fn (InventoryAdjustment $record) => $this->subtitle([$record->reason, $this->statusLabel($record->status)]), 'adjustment_date'),
                ],
            ],
            [
                'key' => 'pos',
                'module' => 'POS',
                'searches' => [
                    [
                        'group' => 'POS',
                        'type' => 'pos_sale',
                        'model' => PosSale::class,
                        'permissions' => ['pos.sale.view', 'pos.view'],
                        'search' => ['sale_no', 'customer_name', 'customer_phone', 'status', 'payment_status'],
                        'priority' => ['sale_no', 'customer_name', 'customer_phone'],
                        'with' => ['branch'],
                        'title' => fn (PosSale $record) => $record->sale_no,
                        'subtitle' => fn (PosSale $record) => $this->subtitle([$record->customer_name, $this->formatMoney($record->grand_total), $this->statusLabel($record->payment_status ?: $record->status)]),
                        'url' => fn (PosSale $record) => '/pos/sales/' . $record->id,
                        'status' => fn (PosSale $record) => $record->status,
                        'date' => fn (PosSale $record) => optional($record->sale_date)->toDateString(),
                    ],
                    [
                        'group' => 'POS',
                        'type' => 'pos_shift',
                        'model' => PosShift::class,
                        'permissions' => ['pos.shift.view', 'pos.view'],
                        'search' => ['shift_no', 'status', 'cashier.name', 'posTerminal.name'],
                        'priority' => ['shift_no'],
                        'with' => ['branch', 'cashier', 'posTerminal'],
                        'title' => fn (PosShift $record) => $record->shift_no,
                        'subtitle' => fn (PosShift $record) => $this->subtitle([optional($record->cashier)->name, optional($record->posTerminal)->name, $this->formatMoney($record->total_sales)]),
                        'url' => fn () => '/pos/shifts',
                        'status' => fn (PosShift $record) => $record->status,
                        'date' => fn (PosShift $record) => optional($record->opened_at)->toDateString(),
                    ],
                    [
                        'group' => 'POS',
                        'type' => 'pos_return',
                        'model' => PosReturn::class,
                        'permissions' => ['pos.return.view', 'pos.refund'],
                        'search' => ['return_no', 'reason', 'status', 'posSale.sale_no'],
                        'priority' => ['return_no'],
                        'with' => ['branch', 'posSale'],
                        'title' => fn (PosReturn $record) => $record->return_no,
                        'subtitle' => fn (PosReturn $record) => $this->subtitle([$record->reason, optional($record->posSale)->sale_no, $this->formatMoney($record->refund_amount)]),
                        'url' => fn () => '/pos/returns',
                        'status' => fn (PosReturn $record) => $record->status,
                        'date' => fn (PosReturn $record) => optional($record->return_date)->toDateString(),
                    ],
                    [
                        'group' => 'POS',
                        'type' => 'pos_terminal',
                        'model' => PosTerminal::class,
                        'permissions' => ['pos.terminal.view', 'pos.terminal.manage'],
                        'search' => ['code', 'name', 'location'],
                        'priority' => ['code', 'name'],
                        'with' => ['branch'],
                        'title' => fn (PosTerminal $record) => $record->name,
                        'subtitle' => fn (PosTerminal $record) => $this->subtitle([$record->code, $record->location]),
                        'url' => fn () => '/pos/terminals',
                        'status' => fn (PosTerminal $record) => $record->active ? null : 'inactive',
                    ],
                ],
            ],
            [
                'key' => 'hrm',
                'module' => 'HRM',
                'searches' => [
                    [
                        'group' => 'HRM',
                        'type' => 'employee',
                        'model' => User::class,
                        'permissions' => ['hr.employee.view', 'hrm.users.view', 'settings.roles.manage'],
                        'search' => ['name', 'email', 'username', 'employee_id', 'phone'],
                        'priority' => ['employee_id', 'name', 'email'],
                        'with' => ['branch', 'department'],
                        'title' => fn (User $record) => $record->display_name ?: $record->name,
                        'subtitle' => fn (User $record) => $this->subtitle([
                            $record->employee_id,
                            $record->email,
                            optional($record->department)->name,
                        ]),
                        'url' => fn (User $record) => '/hrm/users/' . $record->id,
                        'status' => fn (User $record) => $record->active ? null : 'inactive',
                    ],
                    [
                        'group' => 'HRM',
                        'type' => 'attendance',
                        'model' => Attendance::class,
                        'permissions' => ['hr.attendance.view'],
                        'search' => ['user.name', 'in_time_status', 'out_time_status', 'comment'],
                        'priority' => ['comment'],
                        'with' => ['branch', 'user'],
                        'title' => fn (Attendance $record) => optional($record->user)->display_name ?: optional($record->user)->name ?: 'Attendance',
                        'subtitle' => fn (Attendance $record) => $this->subtitle([$record->in_time_status, $record->out_time_status, Str::limit((string) $record->comment, 60)]),
                        'url' => fn () => '/hrm/attendance',
                        'status' => fn (Attendance $record) => $record->in_time_status,
                        'date' => fn (Attendance $record) => optional($record->in_time)->toDateString(),
                    ],
                    [
                        'group' => 'HRM',
                        'type' => 'leave_application',
                        'model' => LeaveApplication::class,
                        'permissions' => ['hr.leave.view'],
                        'search' => ['user.name', 'leave_type', 'reason', 'status'],
                        'priority' => ['leave_type', 'status'],
                        'with' => ['branch', 'user'],
                        'title' => fn (LeaveApplication $record) => optional($record->user)->display_name ?: optional($record->user)->name ?: 'Leave application',
                        'subtitle' => fn (LeaveApplication $record) => $this->subtitle([$record->leave_type, Str::limit((string) $record->reason, 60), $this->statusLabel($record->status)]),
                        'url' => fn () => '/hrm/leave-applications',
                        'status' => fn (LeaveApplication $record) => $record->status,
                        'date' => fn (LeaveApplication $record) => optional($record->leave_from)->toDateString(),
                    ],
                    [
                        'group' => 'HRM',
                        'type' => 'payslip',
                        'model' => Payslip::class,
                        'permissions' => ['hr.payslip.view'],
                        'search' => ['user.name', 'salary_month', 'salary_year', 'payment_status'],
                        'priority' => ['salary_year', 'salary_month'],
                        'with' => ['branch', 'user'],
                        'title' => fn (Payslip $record) => optional($record->user)->display_name ?: optional($record->user)->name ?: 'Payslip',
                        'subtitle' => fn (Payslip $record) => $this->subtitle([
                            trim(($record->salary_month ?: '') . ' ' . ($record->salary_year ?: '')),
                            $this->formatMoney($record->total_payable),
                            $this->statusLabel($record->payment_status),
                        ]),
                        'url' => fn () => '/hrm/payslips',
                        'status' => fn (Payslip $record) => $record->payment_status,
                    ],
                ],
            ],
            [
                'key' => 'project',
                'module' => 'Project / Task',
                'searches' => [
                    [
                        'group' => 'Project / Task',
                        'type' => 'project',
                        'model' => Project::class,
                        'permissions' => ['project.view'],
                        'search' => ['name', 'status', 'description'],
                        'priority' => ['name'],
                        'branch_aware' => false,
                        'title' => fn (Project $record) => $record->name,
                        'subtitle' => fn (Project $record) => $this->subtitle([$record->status, Str::limit((string) $record->description, 70)]),
                        'url' => fn (Project $record) => '/hrm/projects/' . $record->id,
                        'status' => fn (Project $record) => $record->status,
                        'date' => fn (Project $record) => optional($record->start_date)->toDateString(),
                    ],
                    [
                        'group' => 'Project / Task',
                        'type' => 'task',
                        'model' => Task::class,
                        'permissions' => ['project.task.view'],
                        'search' => ['name', 'description', 'project.name'],
                        'priority' => ['name'],
                        'with' => ['project', 'taskStatus'],
                        'branch_aware' => false,
                        'title' => fn (Task $record) => $record->name,
                        'subtitle' => fn (Task $record) => $this->subtitle([optional($record->project)->name, Str::limit((string) $record->description, 60)]),
                        'url' => fn () => '/hrm/tasks',
                        'status' => fn (Task $record) => optional($record->taskStatus)->name,
                        'date' => fn (Task $record) => optional($record->start_date)->toDateString(),
                    ],
                    [
                        'group' => 'Project / Task',
                        'type' => 'milestone',
                        'model' => Milestone::class,
                        'permissions' => ['project.milestone.manage'],
                        'search' => ['name', 'status', 'project.name'],
                        'priority' => ['name'],
                        'with' => ['project'],
                        'branch_aware' => false,
                        'title' => fn (Milestone $record) => $record->name,
                        'subtitle' => fn (Milestone $record) => $this->subtitle([optional($record->project)->name, Str::limit((string) $record->description, 60)]),
                        'url' => fn () => '/hrm/milestones',
                        'status' => fn (Milestone $record) => $record->status,
                        'date' => fn (Milestone $record) => optional($record->start_date)->toDateString(),
                    ],
                ],
            ],
            [
                'key' => 'reports',
                'module' => 'Reports',
                'searches' => [
                    [
                        'group' => 'Reports',
                        'type' => 'report',
                        'permissions' => ['reports.view', 'settings.view', 'pos.reports.view'],
                        'static' => true,
                        'items' => [
                            ['title' => 'Trial Balance', 'subtitle' => 'Accounting Report', 'url' => $this->reportUrl('Accounting', 'Trial Balance')],
                            ['title' => 'Balance Sheet', 'subtitle' => 'Accounting Report', 'url' => $this->reportUrl('Accounting', 'Balance Sheet')],
                            ['title' => 'Income Statement', 'subtitle' => 'Accounting Report', 'url' => $this->reportUrl('Accounting', 'Income Statement')],
                            ['title' => 'Customer Ageing Summary', 'subtitle' => 'Receivable Report', 'url' => $this->reportUrl('Receivable', 'Customer Ageing Summary')],
                            ['title' => 'Supplier Ageing Summary', 'subtitle' => 'Payable Report', 'url' => $this->reportUrl('Payable', 'Supplier Ageing Summary')],
                            ['title' => 'Sales Register', 'subtitle' => 'Tax Report', 'url' => $this->reportUrl('Tax Report', 'Sales Register')],
                            ['title' => 'Inventory Position', 'subtitle' => 'Inventory Report', 'url' => $this->reportUrl('Inventory Report', 'Inventory Position')],
                            ['title' => 'Payroll Summary', 'subtitle' => 'HRM Report', 'url' => '/human-resource/payroll'],
                            ['title' => 'Activity Log', 'subtitle' => 'System Report', 'url' => $this->reportUrl('System Report', 'Activity Log')],
                        ],
                    ],
                ],
            ],
        ];
    }

    protected function documentDefinition(
        string $group,
        string $type,
        string $modelClass,
        array $permissions,
        array $search,
        array $with,
        string $urlPrefix,
        callable $title,
        callable $subtitle,
        string $dateField
    ): array {
        return [
            'group' => $group,
            'type' => $type,
            'model' => $modelClass,
            'permissions' => $permissions,
            'search' => $search,
            'priority' => [$search[0]],
            'with' => $with,
            'title' => $title,
            'subtitle' => $subtitle,
            'url' => fn (Model $record) => $urlPrefix . $record->id,
            'status' => fn (Model $record) => $record->status,
            'date' => fn (Model $record) => optional($record->{$dateField})->toDateString(),
        ];
    }
}
