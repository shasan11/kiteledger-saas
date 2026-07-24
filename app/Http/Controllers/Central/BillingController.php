<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Http\Requests\Central\StoreManualPaymentRequest;
use App\Jobs\SaaS\DeliverTenantInvoiceJob;
use App\Models\Central\BillingWebhookEvent;
use App\Models\Central\PaymentGateway;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;
use App\Models\Central\TenantInvoice;
use App\Services\Payments\ManualPaymentService;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function subscriptions(Request $request)
    {
        return $this->render($request, 'subscriptions', Subscription::with(['tenant', 'plan']));
    }

    public function invoices(Request $request)
    {
        return $this->render($request, 'invoices', TenantInvoice::with(['tenant:id,company_name', 'subscription.plan:id,name', 'payments']));
    }

    public function payments(Request $request)
    {
        return $this->render($request, 'payments', PaymentTransaction::with(['tenant:id,company_name', 'invoice:id,invoice_number', 'addedBy:id,name']));
    }

    public function gateways(Request $request)
    {
        return $this->render($request, 'gateways', PaymentGateway::query());
    }

    public function createPayment(Request $request)
    {
        return Inertia::render('Central/Billing/ManualPayment', [
            'tenants' => Tenant::select('id', 'company_name')->orderBy('company_name')->get(),
            'invoices' => TenantInvoice::whereNotIn('status', ['paid', 'void'])->orderByDesc('id')->get(['id', 'tenant_id', 'invoice_number', 'total', 'paid_amount', 'balance', 'currency']),
            'defaults' => ['invoice_id' => $request->integer('invoice_id') ?: null, 'tenant_id' => $request->string('tenant_id')->toString() ?: null, 'idempotency_key' => (string) Str::uuid()],
        ]);
    }

    public function storePayment(StoreManualPaymentRequest $request, ManualPaymentService $service, CentralAuditService $audit)
    {
        $invoice = TenantInvoice::findOrFail($request->integer('invoice_id'));
        abort_if($request->filled('tenant_id') && $invoice->tenant_id !== $request->string('tenant_id')->toString(), 422, 'The invoice does not belong to the selected tenant.');
        $data = $request->validated();
        if ($request->hasFile('proof')) {
            $data['proof_disk'] = 'local';
            $data['proof_path'] = $request->file('proof')->store('central/payment-proofs', 'local');
        }
        $data['added_by'] = $request->user('central')->id;
        $payment = $service->record($invoice, $data);
        $audit->log($request, 'payment.manual_recorded', $payment, [], collect($payment->getAttributes())->except(['raw_response', 'proof_path'])->all());

        return redirect()->route('central.payments.index')->with('success', 'Manual payment recorded.');
    }

    public function paymentProof(PaymentTransaction $payment)
    {
        abort_unless($payment->has_proof, 404);

        return Storage::disk($payment->proof_disk)->download($payment->getRawOriginal('proof_path'));
    }

    public function sendInvoice(Request $request, TenantInvoice $invoice, CentralAuditService $audit)
    {
        abort_if(blank($invoice->tenant?->owner_email), 422, 'The tenant owner does not have an email address.');
        $job = new DeliverTenantInvoiceJob($invoice->id);
        app()->environment('testing') || ! app(PlatformSettingsService::class)->get('queue_scheduler.queue_enabled', true) ? dispatch_sync($job) : dispatch($job);
        $audit->log($request, 'invoice.sent', $invoice, [], ['recipient' => $invoice->tenant->owner_email]);

        return back()->with('success', 'Invoice delivery queued.');
    }

    public function updateGateway(Request $request, PaymentGateway $gateway, CentralAuditService $audit)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'], 'mode' => ['required', Rule::in(['sandbox', 'live'])], 'is_active' => ['boolean'],
            'public_key' => ['nullable', 'string', 'max:2000'], 'secret_key' => ['nullable', 'string', 'max:4000'], 'webhook_secret' => ['nullable', 'string', 'max:4000'],
            'supported_currencies' => ['required', 'array', 'min:1'], 'supported_currencies.*' => ['string', 'size:3'], 'sort_order' => ['integer', 'min:0'],
            'config' => ['nullable', 'array'], 'config.methods' => ['nullable', 'array'], 'config.methods.*' => [Rule::in(['bank_transfer', 'cash', 'cheque', 'card_terminal', 'other'])],
            'config.instructions' => ['nullable', 'string', 'max:5000'], 'config.proof_required' => ['nullable', 'boolean'], 'config.admin_approval' => ['nullable', 'boolean'], 'config.webhook_id' => ['nullable', 'string', 'max:255'],
        ]);
        $before = $gateway->only(['name', 'mode', 'is_active', 'supported_currencies', 'sort_order', 'safe_config']);
        if (blank($data['secret_key'] ?? null)) {
            unset($data['secret_key']);
        }
        if (blank($data['webhook_secret'] ?? null)) {
            unset($data['webhook_secret']);
        }
        $gateway->update($data);
        $audit->log($request, 'gateway.updated', $gateway, $before, $gateway->fresh()->only(['name', 'mode', 'is_active', 'supported_currencies', 'sort_order', 'safe_config']));

        return back()->with('success', 'Payment gateway saved.');
    }

    public function testGateway(PaymentGateway $gateway)
    {
        try {
            $message = match ($gateway->slug) {
                'manual' => 'Manual payment workflow is ready.',
                'stripe' => (string) Http::withToken($gateway->secret_key)->timeout(12)->get('https://api.stripe.com/v1/account')->throw()->json('id'),
                'paypal' => (string) Http::withBasicAuth($gateway->public_key, $gateway->secret_key)->asForm()->timeout(12)->post($gateway->mode === 'live' ? 'https://api-m.paypal.com/v1/oauth2/token' : 'https://api-m.sandbox.paypal.com/v1/oauth2/token', ['grant_type' => 'client_credentials'])->throw()->json('access_token'),
                'razorpay' => 'Authenticated as '.Http::withBasicAuth($gateway->public_key, $gateway->secret_key)->timeout(12)->get('https://api.razorpay.com/v1/payments', ['count' => 1])->throw()->status(),
                default => throw new \RuntimeException('Unsupported gateway driver.'),
            };
            $gateway->update(['last_tested_at' => now(), 'last_test_status' => 'success', 'last_test_message' => $gateway->slug === 'manual' ? $message : 'Provider authentication succeeded.']);

            return back()->with('success', $gateway->last_test_message);
        } catch (\Throwable $exception) {
            $gateway->update(['last_tested_at' => now(), 'last_test_status' => 'failed', 'last_test_message' => 'Provider authentication failed. Verify the mode and credentials.']);

            return back()->with('error', $gateway->last_test_message);
        }
    }

    private function render(Request $request, string $kind, $query)
    {
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $columns = match ($kind) {
                'invoices' => ['invoice_number', 'tenant_id'], 'payments' => ['reference', 'tenant_id', 'gateway_transaction_id'], 'gateways' => ['name', 'slug'], default => ['tenant_id', 'status']
            };
            $query->where(fn ($q) => collect($columns)->each(fn ($column) => $q->orWhere($column, 'like', $term)));
        }
        $rows = $query->latest('id')->paginate(25)->withQueryString();
        if ($kind === 'gateways') {
            $events = BillingWebhookEvent::latest()->limit(50)->get()->groupBy('gateway');
            $rows->through(function (PaymentGateway $gateway) use ($events): PaymentGateway {
                $recent = $events->get($gateway->slug, collect())->take(5);
                $gateway->setAttribute('webhook_url', route('central.billing.webhook', $gateway->slug));
                $gateway->setAttribute('webhook_health', $recent->first()?->status ?: 'no_events');
                $gateway->setAttribute('recent_webhook_events', $recent->values());

                return $gateway;
            });
        }

        return Inertia::render('Central/Billing/Index', ['kind' => $kind, 'rows' => $rows, 'filters' => $request->only('search', 'status')]);
    }
}
