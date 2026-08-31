<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Central\TenantInvoice;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PortalInvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        $filter = $request->validate([
            'status' => ['nullable', Rule::in(['paid', 'unpaid'])],
        ])['status'] ?? 'unpaid';

        $tenantIds = $request->user('platform')->memberships()
            ->where('is_active', true)->whereNull('revoked_at')->where('can_view_invoices', true)
            ->pluck('tenant_id');

        $baseQuery = TenantInvoice::query()->whereIn('tenant_id', $tenantIds);
        $counts = [
            'all' => (clone $baseQuery)->count(),
            'paid' => (clone $baseQuery)->where('status', 'paid')->count(),
            'unpaid' => (clone $baseQuery)->whereNotIn('status', ['paid', 'void'])->count(),
        ];

        $invoices = TenantInvoice::query()
            ->with('tenant:id,company_name')
            ->whereIn('tenant_id', $tenantIds)
            ->when($filter === 'paid', fn ($query) => $query->where('status', 'paid'))
            ->when($filter === 'unpaid', fn ($query) => $query->whereNotIn('status', ['paid', 'void']))
            ->latest('issue_date')->paginate(20)
            ->through(fn (TenantInvoice $invoice): array => [
                'id' => $invoice->getKey(),
                'tenant_id' => $invoice->tenant_id,
                'organization' => $invoice->tenant?->company_name,
                'invoice_number' => $invoice->invoice_number,
                'issue_date' => $invoice->issue_date,
                'due_date' => $invoice->due_date,
                'total' => $invoice->total,
                'balance' => $invoice->balance,
                'currency' => $invoice->currency,
                'status' => $invoice->status,
            ]);

        return Inertia::render('Platform/Invoices/Index', [
            'invoices' => $invoices,
            'filter' => $filter,
            'counts' => $counts,
        ]);
    }
}
