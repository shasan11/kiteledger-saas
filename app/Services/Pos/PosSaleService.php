<?php

namespace App\Services\Pos;

use App\Models\Contact;
use App\Models\Currency;
use App\Models\CustomerPayment;
use App\Models\CustomerPaymentLine;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\PosCashMovement;
use App\Models\PosPayment;
use App\Models\PosSale;
use App\Models\PosSaleLine;
use App\Models\PosShift;
use App\Models\PosTerminal;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Auth\Access\AuthorizationException;
use InvalidArgumentException;

class PosSaleService
{
    public function __construct(
        protected PosCartCalculatorService $calculator,
        protected PosShiftService $shiftService,
        protected PosInventoryService $inventoryService,
        protected PosAccountingService $accountingService,
    ) {
    }

    public function createOrUpdateDraft(?PosSale $sale, array $payload): PosSale
    {
        return DB::transaction(function () use ($sale, $payload) {
            $terminal = PosTerminal::query()->findOrFail($payload['pos_terminal_id']);
            $shift = $this->resolveOpenShift($payload, $sale, $terminal);

            if ($shift->status !== 'open') {
                throw new InvalidArgumentException('An open shift is required before saving a POS sale.');
            }

            $calculated = $this->calculator->calculate(
                $payload['items'],
                $payload['payments'] ?? [],
                (float) ($payload['round_off'] ?? 0)
            );

            $contact = !empty($payload['contact_id'])
                ? Contact::query()->find($payload['contact_id'])
                : $terminal->defaultCustomer;

            $sale ??= new PosSale([
                'user_add_id' => auth()->id(),
                'active' => true,
            ]);

            if ($sale->exists && in_array($sale->status, ['completed', 'refunded', 'part_refunded', 'cancelled'], true)) {
                throw new InvalidArgumentException('Completed or cancelled POS sales cannot be edited.');
            }

            $this->assertSaleBranchScope($terminal, $shift);

            $sale->fill([
                'branch_id' => $terminal->branch_id,
                'pos_terminal_id' => $terminal->id,
                'pos_shift_id' => $shift->id,
                'warehouse_id' => $payload['warehouse_id'] ?? $terminal->warehouse_id,
                'contact_id' => $contact?->id,
                'sale_date' => $payload['sale_date'] ?? now(),
                'customer_name' => $payload['customer_name'] ?? $contact?->name,
                'customer_phone' => $payload['customer_phone'] ?? $contact?->phone,
                'customer_email' => $payload['customer_email'] ?? $contact?->email,
                'subtotal' => $calculated['subtotal'],
                'discount_total' => $calculated['discount_total'],
                'tax_total' => $calculated['tax_total'],
                'round_off' => $calculated['round_off'],
                'grand_total' => $calculated['grand_total'],
                'paid_total' => $calculated['paid_total'],
                'balance_due' => $calculated['balance_due'],
                'change_amount' => $calculated['change_amount'],
                'payment_status' => $calculated['payment_status'],
                'status' => $payload['status'] ?? 'draft',
                'notes' => $payload['notes'] ?? null,
                'receipt_note' => $payload['receipt_note'] ?? null,
            ]);
            $sale->save();

            $this->syncLines($sale, $calculated['items']);
            $this->syncPayments($sale, $payload['payments'] ?? []);

            return $sale->fresh([
                'branch',
                'posTerminal',
                'posShift',
                'contact',
                'warehouse',
                'posSaleLines.product',
                'posSaleLines.taxRate',
                'posPayments.account',
            ]);
        });
    }

    public function holdSale(PosSale $sale, array $payload = []): PosSale
    {
        $sale = $this->createOrUpdateDraft($sale, [
            ...$sale->toArray(),
            ...$payload,
            'status' => 'held',
            'pos_terminal_id' => $payload['pos_terminal_id'] ?? $sale->pos_terminal_id,
            'pos_shift_id' => $payload['pos_shift_id'] ?? $sale->pos_shift_id,
            'items' => $payload['items'] ?? $sale->posSaleLines->map(fn ($line) => $line->only([
                'product_id', 'product_name', 'product_code', 'barcode', 'qty', 'unit_price',
                'discount_percent', 'discount_amount', 'tax_rate_id', 'is_complimentary',
                'complimentary_reason', 'remarks',
            ]))->all(),
            'payments' => $payload['payments'] ?? $sale->posPayments->map(fn ($payment) => $payment->only([
                'payment_date', 'payment_method', 'account_id', 'amount', 'reference', 'card_last_four', 'transaction_no', 'notes',
            ]))->all(),
        ]);

        return $sale->refresh();
    }

    public function completeSale(PosSale $sale, array $payload): PosSale
    {
        return DB::transaction(function () use ($sale, $payload) {
            if (!in_array($sale->status, ['draft', 'held'], true)) {
                throw new InvalidArgumentException('Only draft or held sales can be completed.');
            }

            $draft = $this->createOrUpdateDraft($sale, [
                ...$payload,
                'pos_terminal_id' => $sale->pos_terminal_id,
                'pos_shift_id' => $sale->pos_shift_id,
                'warehouse_id' => $payload['warehouse_id'] ?? $sale->warehouse_id,
                'status' => 'draft',
            ]);

            if ($draft->posSaleLines()->count() < 1) {
                throw new InvalidArgumentException('Cannot complete an empty cart.');
            }

            $allowCreditSale = (bool) ($payload['allow_credit_sale'] ?? false);

            if (!$allowCreditSale && $draft->posPayments()->sum('amount') <= 0) {
                throw new InvalidArgumentException('At least one payment is required before completing the sale.');
            }

            foreach ($draft->posSaleLines as $line) {
                if (!$line->product_id) {
                    continue;
                }

                $product = Product::query()->findOrFail($line->product_id);

                if (!$product->active) {
                    throw new InvalidArgumentException("Inactive product {$product->name} cannot be sold.");
                }

                if (!$product->allow_sale) {
                    throw new InvalidArgumentException("Product {$product->name} is not allowed for sale.");
                }

                $this->inventoryService->validateStock($product->id, (float) $line->qty, $draft->warehouse_id);
            }

            $draft->forceFill([
                'status' => 'completed',
                'approved' => (bool) ($payload['approved'] ?? true),
                'approved_at' => ($payload['approved'] ?? true) ? now() : null,
                'approved_by_id' => ($payload['approved'] ?? true) ? auth()->id() : null,
            ])->save();

            $this->ensureInvoice($draft);
            $this->ensureCustomerPayment($draft);
            $this->ensureCashSaleMovements($draft->fresh(['posPayments', 'posTerminal']));
            $this->accountingService->approveSaleArtifacts($draft->fresh(['invoice', 'customerPayment']));
            $this->shiftService->recalculate($draft->posShift);

            return $draft->fresh([
                'branch',
                'posTerminal',
                'posShift',
                'contact',
                'warehouse',
                'invoice',
                'customerPayment.customerPaymentLines',
                'posSaleLines.product',
                'posSaleLines.taxRate',
                'posPayments.account',
            ]);
        });
    }

    public function cancel(PosSale $sale): PosSale
    {
        if (!in_array($sale->status, ['draft', 'held'], true)) {
            throw new InvalidArgumentException('Only draft or held sales can be cancelled.');
        }

        $sale->forceFill(['status' => 'cancelled'])->save();

        return $sale->refresh();
    }

    public function void(PosSale $sale, string $reason): PosSale
    {
        if (!in_array($sale->status, ['completed', 'part_refunded'], true)) {
            throw new InvalidArgumentException('Only completed sales can be voided.');
        }

        $sale->forceFill([
            'void' => true,
            'voided_reason' => $reason,
            'voided_at' => now(),
            'voided_by_id' => auth()->id(),
            'status' => 'cancelled',
        ])->save();

        return $sale->refresh();
    }

    public function processCompletedSale(PosSale $sale): PosSale
    {
        if ($sale->status !== 'completed') {
            return $sale;
        }

        if (!$sale->invoice_id) {
            $this->ensureInvoice($sale);
        }

        if (!$sale->customer_payment_id && (float) $sale->paid_total > 0) {
            $this->ensureCustomerPayment($sale);
        }

        if ($sale->approved) {
            $this->accountingService->approveSaleArtifacts($sale->fresh(['invoice', 'customerPayment']));
        }

        $this->ensureCashSaleMovements($sale->fresh(['posPayments', 'posTerminal']));
        $this->shiftService->recalculate($sale->posShift);

        return $sale->refresh();
    }

    private function syncLines(PosSale $sale, array $items): void
    {
        $existingIds = [];

        foreach ($items as $item) {
            $line = !empty($item['id'])
                ? PosSaleLine::query()->where('pos_sale_id', $sale->id)->find($item['id'])
                : new PosSaleLine(['pos_sale_id' => $sale->id]);

            $product = !empty($item['product_id']) ? Product::query()->find($item['product_id']) : null;

            $line ??= new PosSaleLine(['pos_sale_id' => $sale->id]);
            $line->fill([
                'product_id' => $product?->id ?? ($item['product_id'] ?? null),
                'product_name' => $item['product_name'] ?? $product?->name ?? 'Custom Product',
                'product_code' => $item['product_code'] ?? $product?->code,
                'barcode' => $item['barcode'] ?? $product?->barcode,
                'qty' => $item['qty'],
                'unit_price' => $item['unit_price'],
                'discount_percent' => $item['discount_percent'] ?? 0,
                'discount_amount' => $item['discount_amount'] ?? 0,
                'tax_rate_id' => $item['tax_rate_id'] ?? null,
                'tax_amount' => $item['tax_amount'] ?? 0,
                'line_total' => $item['line_total'] ?? 0,
                'is_complimentary' => (bool) ($item['is_complimentary'] ?? false),
                'complimentary_reason' => $item['complimentary_reason'] ?? null,
                'remarks' => $item['remarks'] ?? null,
                'active' => true,
            ]);
            $line->pos_sale_id = $sale->id;
            $line->save();

            $existingIds[] = $line->id;
        }

        $sale->posSaleLines()->whereNotIn('id', $existingIds)->delete();
    }

    private function syncPayments(PosSale $sale, array $payments): void
    {
        $existingIds = [];

        foreach ($payments as $payment) {
            $row = !empty($payment['id'])
                ? PosPayment::query()->where('pos_sale_id', $sale->id)->find($payment['id'])
                : new PosPayment(['pos_sale_id' => $sale->id]);

            $row ??= new PosPayment(['pos_sale_id' => $sale->id]);
            $row->fill([
                'payment_date' => $payment['payment_date'] ?? $sale->sale_date ?? now(),
                'payment_method' => $payment['payment_method'],
                'account_id' => $payment['account_id'] ?? $this->defaultAccountIdForMethod($sale, $payment['payment_method']),
                'amount' => round((float) $payment['amount'], 2),
                'reference' => $payment['reference'] ?? null,
                'card_last_four' => $payment['card_last_four'] ?? null,
                'transaction_no' => $payment['transaction_no'] ?? null,
                'notes' => $payment['notes'] ?? null,
                'active' => true,
            ]);
            $row->pos_sale_id = $sale->id;
            $row->save();

            $existingIds[] = $row->id;
        }

        $sale->posPayments()->whereNotIn('id', $existingIds)->delete();
    }

    private function ensureInvoice(PosSale $sale): void
    {
        if ($sale->invoice_id) {
            return;
        }

        $invoice = Invoice::create([
            'branch_id' => $sale->branch_id,
            'invoice_date' => optional($sale->sale_date)->toDateString() ?? now()->toDateString(),
            'due_date' => optional($sale->sale_date)->toDateString() ?? now()->toDateString(),
            'contact_id' => $sale->contact_id,
            'warehouse_id' => $sale->warehouse_id,
            'currency_id' => Currency::query()->where('is_base', true)->value('id'),
            'reference' => $sale->sale_no,
            'notes' => $sale->notes,
            'paid_total' => $sale->paid_total,
            'balance_due' => $sale->balance_due,
            'status' => $sale->balance_due > 0 ? 'part_paid' : 'paid',
            'approved' => $sale->approved,
            'approved_at' => $sale->approved ? ($sale->approved_at ?? now()) : null,
            'approved_by_id' => $sale->approved ? ($sale->approved_by_id ?? auth()->id()) : null,
            'exchange_rate' => 1,
            'total' => $sale->grand_total,
            'user_add_id' => auth()->id(),
        ]);

        foreach ($sale->posSaleLines as $line) {
            InvoiceLine::create([
                'invoice_id' => $invoice->id,
                'product_id' => $line->product_id,
                'custom_product_name' => $line->product_id ? null : $line->product_name,
                'description' => $line->remarks,
                'qty' => $line->qty,
                'unit_price' => $line->unit_price,
                'discount_percent' => $line->discount_percent,
                'tax_rate_id' => $line->tax_rate_id,
                'tax_amount' => $line->tax_amount,
                'line_total' => $line->line_total,
            ]);
        }

        $sale->forceFill(['invoice_id' => $invoice->id])->saveQuietly();
    }

    private function ensureCustomerPayment(PosSale $sale): void
    {
        if ($sale->customer_payment_id || (float) $sale->paid_total <= 0) {
            return;
        }

        $defaultAccountId = $sale->posPayments()->value('account_id')
            ?: $sale->posTerminal?->cash_account_id
            ?: $sale->posTerminal?->card_account_id
            ?: $sale->posTerminal?->online_account_id;

        $payment = CustomerPayment::create([
            'branch_id' => $sale->branch_id,
            'payment_date' => optional($sale->sale_date)->toDateString() ?? now()->toDateString(),
            'contact_id' => $sale->contact_id,
            'account_id' => $defaultAccountId,
            'currency_id' => Currency::query()->where('is_base', true)->value('id'),
            'amount' => $sale->paid_total,
            'payment_method' => $sale->posPayments()->count() > 1 ? 'mixed' : ($sale->posPayments()->value('payment_method') ?? 'cash'),
            'reference' => $sale->sale_no,
            'notes' => $sale->notes,
            'status' => 'posted',
            'approved' => $sale->approved,
            'approved_at' => $sale->approved ? ($sale->approved_at ?? now()) : null,
            'approved_by_id' => $sale->approved ? ($sale->approved_by_id ?? auth()->id()) : null,
            'exchange_rate' => 1,
            'total' => $sale->paid_total,
            'user_add_id' => auth()->id(),
        ]);

        if ($sale->invoice_id) {
            CustomerPaymentLine::create([
                'customer_payment_id' => $payment->id,
                'invoice_id' => $sale->invoice_id,
                'allocated_amount' => $sale->paid_total,
            ]);
        }

        $sale->forceFill(['customer_payment_id' => $payment->id])->saveQuietly();
    }

    private function resolveOpenShift(array $payload, ?PosSale $sale, PosTerminal $terminal): PosShift
    {
        $shiftId = $payload['pos_shift_id'] ?? $sale?->pos_shift_id;

        $shift = $shiftId
            ? PosShift::query()->find($shiftId)
            : PosShift::query()
                ->where('pos_terminal_id', $terminal->id)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first();

        if (!$shift) {
            throw new InvalidArgumentException('An open shift is required before saving a POS sale.');
        }

        if ($shift->pos_terminal_id !== $terminal->id) {
            throw new InvalidArgumentException('The selected shift does not belong to the selected terminal.');
        }

        if ((string) $shift->branch_id !== (string) $terminal->branch_id) {
            throw new InvalidArgumentException('The selected shift does not belong to the selected terminal branch.');
        }

        if ($shift->cashier_id && auth()->id() && (int) $shift->cashier_id !== (int) auth()->id()) {
            $user = request()->user();

            if (!$user || !$user->can('pos.shift.update')) {
                throw new AuthorizationException('You cannot use another cashier shift.');
            }
        }

        return $shift;
    }

    private function assertSaleBranchScope(PosTerminal $terminal, PosShift $shift): void
    {
        $user = request()->user();

        if (!$user || !$terminal->branch_id) {
            return;
        }

        try {
            if ($user->can('branch.view_all') || $user->can('branches.view-all') || $user->can('branches.view_all')) {
                return;
            }
        } catch (\Throwable) {
            //
        }

        $branchIds = array_filter([
            $user->current_branch_id ?? null,
            $user->branch_id ?? null,
        ]);

        if (!in_array((string) $terminal->branch_id, array_map('strval', $branchIds), true)) {
            throw new AuthorizationException('You cannot create a POS sale for another branch.');
        }

        if ((string) $shift->branch_id !== (string) $terminal->branch_id) {
            throw new InvalidArgumentException('The POS sale branch must match the terminal and shift branch.');
        }
    }

    private function defaultAccountIdForMethod(PosSale $sale, string $method): ?string
    {
        $terminal = $sale->posTerminal ?: PosTerminal::query()->find($sale->pos_terminal_id);

        return match ($method) {
            'cash' => $terminal?->cash_account_id,
            'card' => $terminal?->card_account_id,
            'online', 'wallet', 'bank_transfer' => $terminal?->online_account_id,
            default => null,
        };
    }

    private function ensureCashSaleMovements(PosSale $sale): void
    {
        $cashPayments = $sale->posPayments->where('payment_method', 'cash');

        foreach ($cashPayments as $payment) {
            PosCashMovement::query()->firstOrCreate(
                [
                    'source_type' => PosPayment::class,
                    'source_id' => $payment->id,
                ],
                [
                    'branch_id' => $sale->branch_id,
                    'pos_terminal_id' => $sale->pos_terminal_id,
                    'pos_shift_id' => $sale->pos_shift_id,
                    'movement_date' => $payment->payment_date ?? $sale->sale_date ?? now(),
                    'type' => 'cash_in',
                    'amount' => round((float) $payment->amount, 2),
                    'reason' => 'Cash sale',
                    'notes' => 'System generated cash movement for POS sale ' . $sale->sale_no,
                    'account_id' => $payment->account_id ?: $sale->posTerminal?->cash_account_id,
                    'approved' => true,
                    'approved_at' => now(),
                    'approved_by_id' => $sale->approved_by_id ?: auth()->id(),
                    'active' => true,
                    'is_system_generated' => true,
                    'source_reference' => $sale->sale_no,
                    'user_add_id' => auth()->id(),
                ]
            );
        }
    }
}
