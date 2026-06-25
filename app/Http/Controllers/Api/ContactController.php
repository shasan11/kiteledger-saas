<?php

namespace App\Http\Controllers\Api;

use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\CrmCommunication;
use App\Models\CustomerPayment;
use App\Models\DebitNote;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\JournalVoucherLine;
use App\Models\PurchaseBill;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\SalesReturn;
use App\Models\SupplierPayment;
use App\Services\Media\MediaStorageService;
use App\Services\SmsService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ContactController extends BaseCrudApiController
{
    protected string $modelClass = Contact::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = false;

    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'contactGroup',
        'account',
        'payableAccount',
        'crmAccount',
        'creditTerm',
    ];

    protected array $relationDetails = [
        'contactGroup' => 'contact_group_id',
        'account' => 'account_id',
        'payableAccount' => 'payable_account_id',
        'crmAccount' => 'crm_account_id',
        'creditTerm' => 'credit_term_id',
    ];

    protected array $searchable = [
        'name',
        'code',
        'phone',
        'email',
        'pan',
        'contactGroup.name',
        'account.name',
        'account.code',
        'payableAccount.name',
        'payableAccount.code',
        'crmAccount.name',
        'creditTerm.name',
    ];

    protected array $filterable = [
        'contact_group_id',
        'account_id',
        'payable_account_id',
        'crm_account_id',
        'contact_type',
        'credit_term_id',
    ];

    protected array $booleanFilters = [
        'active',
        'accept_purchase',
    ];

    protected array $sortable = [
        'id',
        'name',
        'code',
        'contact_type',
        'credit_limit',
        'branch_id',
        'contact_group_id',
        'credit_term_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected function baseQuery(): Builder
    {
        $query = parent::baseQuery();

        if (request()->filled('type') && ! request()->filled('contact_type')) {
            $query->where('contact_type', request()->query('type'));
        }

        return request()->boolean('assigned_only')
            ? $this->applyAssignedUserScope($query)
            : $query;
    }

    protected function findRecord(mixed $id): Model
    {
        $query = $this->newQuery();

        return request()->boolean('assigned_only')
            ? $this->applyAssignedUserScope($query)->findOrFail($id)
            : $query->findOrFail($id);
    }

    private function applyAssignedUserScope(Builder $query): Builder
    {
        $user = request()->user();

        if (! $user || $this->userHasFullCrmAccess($user)) {
            return $query;
        }

        $userId = $user->getAuthIdentifier();

        return $query->where(function (Builder $query) use ($userId) {
            $query->whereHas('leads', fn (Builder $leadQuery) => $leadQuery->where('assigned_to_id', $userId))
                ->orWhereHas('deals', fn (Builder $dealQuery) => $dealQuery->where('assigned_to_id', $userId))
                ->orWhereHas('crmActivities', fn (Builder $activityQuery) => $activityQuery->where('assigned_to_id', $userId));
        });
    }

    private function userHasFullCrmAccess($user): bool
    {
        return method_exists($user, 'can') && (
            $user->can('crm.manage') ||
            $user->can('crm.*') ||
            $user->can('master.contact.view')
        );
    }

    protected array $storeRules = [
        'contact_group_id' => ['nullable', 'uuid', 'exists:contact_groups,id'],
        'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'payable_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'crm_account_id' => ['nullable', 'uuid', 'exists:crm_accounts,id'],
        'contact_type' => ['required', 'in:customer,supplier,lead'],
        'name' => ['required', 'string', 'max:180'],
        'code' => ['nullable', 'string', 'max:50'],
        'address' => ['nullable', 'string'],
        'image' => ['nullable', 'file', 'image', 'max:5120'],
        'remove_image' => ['nullable', 'boolean'],
        'pan' => ['nullable', 'string', 'max:80'],
        'tax_registration_no' => ['nullable', 'string', 'max:80'],
        'tax_registration_type' => ['nullable', 'in:pan,vat,gstin,tan,ein,sales_tax_permit,state_tax_id,none'],
        'phone' => ['nullable', 'string', 'max:40'],
        'accept_purchase' => ['nullable', 'boolean'],
        'email' => ['nullable', 'email', 'max:120'],
        'credit_term_id' => ['nullable', 'uuid', 'exists:credit_terms,id'],
        'credit_limit' => ['nullable', 'numeric', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'contact_group_id' => ['sometimes', 'nullable', 'uuid', 'exists:contact_groups,id'],
            'account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'payable_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'crm_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:crm_accounts,id'],
            'contact_type' => ['sometimes', 'required', 'in:customer,supplier,lead'],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address' => ['sometimes', 'nullable', 'string'],
            'image' => ['sometimes', 'nullable', 'file', 'image', 'max:5120'],
            'remove_image' => ['sometimes', 'nullable', 'boolean'],
            'pan' => ['sometimes', 'nullable', 'string', 'max:80'],
            'tax_registration_no' => ['sometimes', 'nullable', 'string', 'max:80'],
            'tax_registration_type' => ['sometimes', 'nullable', 'in:pan,vat,gstin,tan,ein,sales_tax_permit,state_tax_id,none'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'accept_purchase' => ['sometimes', 'nullable', 'boolean'],
            'email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'credit_term_id' => ['sometimes', 'nullable', 'uuid', 'exists:credit_terms,id'],
            'credit_limit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(
        array $parentData,
        array $nestedData
    ): array {
        return $this->resolveImagePayload($parentData, null);
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        return $this->resolveImagePayload($parentData, $record);
    }

    private function resolveImagePayload(array $parentData, ?Model $record): array
    {
        $request = request();
        $removeImage = (bool) ($parentData['remove_image'] ?? false);
        unset($parentData['remove_image']);

        if ($request && $request->hasFile('image')) {
            if ($record instanceof Contact && $record->image) {
                app(MediaStorageService::class)->delete($record->image);
            }

            $parentData['image'] = app(MediaStorageService::class)->store($request->file('image'), 'contacts/images');

            return $parentData;
        }

        // No new file uploaded. Strip the field unless we are explicitly clearing.
        unset($parentData['image']);

        if ($removeImage && $record instanceof Contact) {
            if ($record->image) {
                app(MediaStorageService::class)->delete($record->image);
            }
            $parentData['image'] = null;
        }

        return $parentData;
    }

    /**
     * Set by show() to indicate we are serializing a single record.
     * Used to skip expensive chart queries during list serialization.
     */
    private bool $serializingForShow = false;

    public function show(Request $request, mixed $id): JsonResponse
    {
        $this->serializingForShow = true;

        return parent::show($request, $id);
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $data['recent_transactions'] = [];
        $data['account_summary'] = null;
        $data['payable_account_summary'] = null;
        $data['account_chart'] = [];
        $imageUrl = ($record instanceof Contact && $record->image)
            ? app(MediaStorageService::class)->url($record->image)
            : null;
        $data['image_url'] = $imageUrl;
        $data['image'] = $imageUrl;

        if (! $record->account_id) {
            return $data;
        }

        $account = $record->account;
        if ($account) {
            $data['account_summary'] = [
                'name' => $account->name,
                'code' => $account->code,
                'balance' => (float) ($account->balance ?? 0),
                'dr_amount' => (float) ($account->dr_amount ?? 0),
                'cr_amount' => (float) ($account->cr_amount ?? 0),
                'nature' => $account->nature,
            ];
        }

        if ($record->payable_account_id && $record->payableAccount) {
            $data['payable_account_summary'] = [
                'name' => $record->payableAccount->name,
                'code' => $record->payableAccount->code,
                'balance' => (float) ($record->payableAccount->balance ?? 0),
                'dr_amount' => (float) ($record->payableAccount->dr_amount ?? 0),
                'cr_amount' => (float) ($record->payableAccount->cr_amount ?? 0),
                'nature' => $record->payableAccount->nature,
            ];
        }

        // Only compute expensive transaction history for single-record (show) requests.
        if (! $this->serializingForShow) {
            return $data;
        }

        $chartAccountIds = ChartOfAccount::query()
            ->where('account_id', $record->account_id)
            ->pluck('id');

        if ($chartAccountIds->isEmpty()) {
            return $data;
        }

        $lines = JournalVoucherLine::query()
            ->with(['journalVoucher.branch'])
            ->whereIn('chart_of_account_id', $chartAccountIds)
            ->whereHas('journalVoucher', fn ($q) => $q->where('status', 'posted')->where('active', true)->where('void', false))
            ->latest('created_at')
            ->limit(25)
            ->get();

        $data['recent_transactions'] = $lines->map(function (JournalVoucherLine $line) {
            $voucher = $line->journalVoucher;
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;

            return [
                'id' => $line->getKey(),
                'journal_voucher_id' => $voucher?->getKey(),
                'voucher_no' => $voucher?->voucher_no,
                'voucher_date' => optional($voucher?->voucher_date)->toDateString(),
                'description' => $line->description ?: $voucher?->narration,
                'debit' => $debit,
                'credit' => $credit,
                'net_movement' => round($debit - $credit, 2),
                'status' => $voucher?->status,
                'approved' => (bool) ($voucher?->approved ?? false),
                'approval_status' => ($voucher?->approved ?? false) ? 'Approved' : 'Not Approved',
                'source_type' => $voucher?->source_type,
                'source_id' => $voucher?->source_id,
                'source_no' => $voucher?->source_no,
                'source_module' => $voucher?->source_module,
                'branch' => $this->serializeRelated($voucher?->branch),
            ];
        })->values()->all();

        // Build monthly chart using a database-driver-aware expression.
        $from = now()->subMonths(11)->startOfMonth();
        $driver = DB::getDriverName();

        $monthExpr = match ($driver) {
            'mysql', 'mariadb' => DB::raw("DATE_FORMAT(journal_vouchers.voucher_date, '%Y-%m') as month"),
            'pgsql' => DB::raw("TO_CHAR(journal_vouchers.voucher_date, 'YYYY-MM') as month"),
            default => DB::raw("strftime('%Y-%m', journal_vouchers.voucher_date) as month"),
        };

        try {
            $monthly = DB::table('journal_voucher_lines')
                ->join('journal_vouchers', 'journal_voucher_lines.journal_voucher_id', '=', 'journal_vouchers.id')
                ->whereIn('journal_voucher_lines.chart_of_account_id', $chartAccountIds)
                ->where('journal_vouchers.status', 'posted')
                ->where('journal_vouchers.active', true)
                ->where('journal_vouchers.void', false)
                ->whereDate('journal_vouchers.voucher_date', '>=', $from->toDateString())
                ->select(
                    $monthExpr,
                    DB::raw('COALESCE(SUM(journal_voucher_lines.debit), 0) as debit'),
                    DB::raw('COALESCE(SUM(journal_voucher_lines.credit), 0) as credit'),
                )
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            $data['account_chart'] = $monthly->map(fn ($row) => [
                'month' => $row->month,
                'debit' => round((float) $row->debit, 2),
                'credit' => round((float) $row->credit, 2),
                'net' => round((float) $row->debit - (float) $row->credit, 2),
            ])->values()->all();
        } catch (\Throwable) {
            // Chart data unavailable; return empty array rather than crashing.
            $data['account_chart'] = [];
        }

        return $data;
    }

    public function transactions(Request $request, string $id): JsonResponse
    {
        $contact = Contact::query()->findOrFail($id);

        $limit = min((int) ($request->query('per_page', 50)), 200);
        $type = $request->query('type');

        $sources = [
            'quotation' => [
                'model' => Quotation::class,
                'number' => 'quotation_no',
                'date' => 'quotation_date',
                'total' => 'total',
                'module' => 'payment-in',
                'path' => 'quotations',
            ],
            'sales_order' => [
                'model' => SalesOrder::class,
                'number' => 'sales_order_no',
                'date' => 'sales_order_date',
                'total' => 'total',
                'module' => 'payment-in',
                'path' => 'sales-orders',
            ],
            'invoice' => [
                'model' => Invoice::class,
                'number' => 'invoice_no',
                'date' => 'invoice_date',
                'total' => 'total',
                'module' => 'payment-in',
                'path' => 'invoices',
            ],
            'customer_payment' => [
                'model' => CustomerPayment::class,
                'number' => 'payment_no',
                'date' => 'payment_date',
                'total' => 'amount',
                'module' => 'payment-in',
                'path' => 'payments',
            ],
            'sales_return' => [
                'model' => SalesReturn::class,
                'number' => 'sales_return_no',
                'date' => 'sales_return_date',
                'total' => 'total',
                'module' => 'payment-in',
                'path' => 'credit-notes',
            ],
            'purchase_order' => [
                'model' => PurchaseOrder::class,
                'number' => 'purchase_order_no',
                'date' => 'purchase_order_date',
                'total' => 'total',
                'module' => 'payment-out',
                'path' => 'purchase-orders',
            ],
            'purchase_bill' => [
                'model' => PurchaseBill::class,
                'number' => 'bill_no',
                'date' => 'bill_date',
                'total' => 'total',
                'module' => 'payment-out',
                'path' => 'purchase-bills',
            ],
            'expense' => [
                'model' => Expense::class,
                'number' => 'expense_no',
                'date' => 'expense_date',
                'total' => 'total',
                'module' => 'payment-out',
                'path' => 'expenses',
            ],
            'debit_note' => [
                'model' => DebitNote::class,
                'number' => 'debit_note_no',
                'date' => 'debit_note_date',
                'total' => 'total',
                'module' => 'payment-out',
                'path' => 'debit-notes',
            ],
            'supplier_payment' => [
                'model' => SupplierPayment::class,
                'number' => 'payment_no',
                'date' => 'payment_date',
                'total' => 'amount',
                'module' => 'payment-out',
                'path' => 'supplier-payments',
            ],
        ];

        if ($type && isset($sources[$type])) {
            $sources = [$type => $sources[$type]];
        }

        $transactions = collect();

        foreach ($sources as $typeName => $config) {
            $modelClass = $config['model'];

            if (! class_exists($modelClass)) {
                continue;
            }

            try {
                $records = $modelClass::query()
                    ->where('contact_id', $contact->id)
                    ->orderByDesc($config['date'])
                    ->limit($limit)
                    ->get();

                foreach ($records as $record) {
                    $transactions->push([
                        'id' => $record->getKey(),
                        'type' => $typeName,
                        'module' => $config['module'],
                        'number' => $record->{$config['number']} ?? null,
                        'date' => optional($record->{$config['date']})->toDateString(),
                        'status' => $record->status ?? null,
                        'amount' => round((float) ($record->{$config['total']} ?? 0), 2),
                        'balance' => round((float) ($record->balance_due ?? 0), 2),
                        'action_url' => "/{$config['module']}/{$config['path']}/{$record->getKey()}",
                    ]);
                }
            } catch (\Throwable) {
                // Table may not exist in all installations
            }
        }

        $sorted = $transactions
            ->sortByDesc('date')
            ->values()
            ->take($limit);

        return response()->json(['data' => $sorted]);
    }

    public function sendEmail(Request $request, string $id): JsonResponse
    {
        $contact = Contact::query()->findOrFail($id);

        if (! $contact->email) {
            return response()->json(['message' => 'Contact has no email address.'], 422);
        }

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
        ]);

        try {
            Mail::raw($validated['body'], function ($mail) use ($contact, $validated, $request) {
                $senderEmail = $request->user()?->email;
                $mail->to($contact->email, $contact->name)
                    ->subject($validated['subject']);

                if ($senderEmail) {
                    $mail->replyTo($senderEmail);
                }
            });

            CrmCommunication::create([
                'contact_id' => $contact->id,
                'type' => 'email',
                'direction' => 'outbound',
                'subject' => $validated['subject'],
                'body' => $validated['body'],
                'from' => $request->user()?->email,
                'to' => $contact->email,
                'communication_date' => now(),
                'created_by' => $request->user()?->id,
            ]);

            return response()->json(['message' => 'Email sent successfully.']);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to send email. Please check mail configuration.',
            ], 500);
        }
    }

    public function sendSms(Request $request, string $id): JsonResponse
    {
        $contact = Contact::query()->findOrFail($id);

        if (! $contact->phone) {
            return response()->json(['message' => 'Contact has no phone number.'], 422);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:1600'],
        ]);

        $smsResult = app(SmsService::class)->send($contact->phone, $validated['message']);
        $sent = $smsResult->success;
        $errorMessage = $smsResult->error ?? 'Failed to send SMS.';

        CrmCommunication::create([
            'contact_id' => $contact->id,
            'type' => 'sms',
            'direction' => 'outbound',
            'body' => $validated['message'],
            'to' => $contact->phone,
            'communication_date' => now(),
            'created_by' => $request->user()?->id,
        ]);

        if (! $sent) {
            return response()->json(['message' => $errorMessage], 422);
        }

        return response()->json(['message' => 'SMS sent successfully.']);
    }
}
