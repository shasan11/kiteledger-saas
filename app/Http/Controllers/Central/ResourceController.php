<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralAuditLog;
use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\PaymentRefund;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\ProvisioningLog;
use App\Models\Central\Subscription;
use App\Models\Central\TenantDatabasePool;
use App\Models\Central\TenantInvoice;
use App\Models\Central\TenantUsageMetric;
use App\Services\Payments\ManualPaymentService;
use App\Services\Payments\PaymentManager;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\CentralNotificationService;
use App\Services\SaaS\DatabaseProvisioning\PoolDatabaseValidator;
use App\Services\SaaS\PlatformSettingsService;
use App\Services\SaaS\SubscriptionService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ResourceController extends Controller
{
    private const RESOURCES = [
        'default-templates' => [DefaultDataTemplate::class, ['id', 'name', 'slug', 'country', 'industry', 'is_default', 'is_active'], true],
        'provisioning-logs' => [ProvisioningLog::class, ['id', 'tenant_id', 'step', 'status', 'message', 'started_at', 'finished_at'], false],
        'tenant-databases' => [TenantDatabasePool::class, ['id', 'database_name', 'status', 'tenant_id', 'validated_at', 'allocated_at', 'last_error'], true],
        'usage' => [TenantUsageMetric::class, ['id', 'tenant_id', 'period_start', 'period_end', 'users_count', 'products_count', 'invoices_count', 'storage_mb', 'ai_requests_count'], false],
        'audit-logs' => [CentralAuditLog::class, ['id', 'admin_id', 'action', 'model_type', 'model_id', 'ip_address', 'created_at'], false],
    ];

    public function index(Request $request)
    {
        [$class, $columns, $editable, $type] = $this->definition($request);
        $query = $class::query()->select($columns);
        if ($type) {
            $query->where('type', $type);
        }
        if ($request->filled('status') && in_array('status', $columns, true)) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('search')) {
            $query->where(function ($query) use ($request, $columns): void {
                foreach (array_intersect($columns, ['name', 'title', 'slug', 'key', 'tenant_id', 'invoice_number']) as $column) {
                    $query->orWhere($column, 'like', '%'.$request->string('search').'%');
                }
            });
        }

        return Inertia::render('Central/Resources/Index', [
            'resource' => $request->route('resource'),
            'rows' => $query->orderByDesc('id')->paginate(25)->withQueryString(),
            'columns' => $columns,
            'editable' => $editable,
            'fields' => $editable ? array_keys($this->rules($request->route('resource'))) : [],
            'summary' => $request->route('resource') === 'tenant-databases' ? $this->tenantDatabaseSummary() : null,
            'filters' => $request->only('search', 'status'),
        ]);
    }

    public function store(Request $request, CentralAuditService $audit)
    {
        [$class, , $editable, $type] = $this->definition($request);
        abort_unless($editable, 405);
        $data = $request->validate($this->rules($request->route('resource')));
        if ($type) {
            $data['type'] = $type;
        }
        if ($request->route('resource') === 'tenant-databases') {
            $data = $this->validatedPoolDatabase($data);
        }
        $model = $class::create($data);
        $audit->log($request, $request->route('resource').'.created', $model, [], $this->auditableAttributes($model));

        return back()->with('success', 'Resource created.');
    }

    public function update(Request $request, int $id, CentralAuditService $audit)
    {
        [$class, , $editable] = $this->definition($request);
        abort_unless($editable, 405);
        $model = $class::findOrFail($id);
        if ($model instanceof TenantDatabasePool) {
            $this->abortIfPoolDatabaseAllocated($model, 'Allocated tenant databases cannot be edited.');
        }
        $old = $model->getAttributes();
        $data = $request->validate($this->rules($request->route('resource'), $model));
        if ($model instanceof TenantDatabasePool) {
            foreach (['username', 'password'] as $secret) {
                if (blank($data[$secret] ?? null)) {
                    unset($data[$secret]);
                }
            }
            $data = $this->validatedPoolDatabase($data, $model);
        }
        $model->update($data);
        $audit->log($request, $request->route('resource').'.updated', $model, $this->auditableAttributes($model, $old), $this->auditableAttributes($model));

        return back()->with('success', 'Resource updated.');
    }

    public function destroy(Request $request, int $id, CentralAuditService $audit)
    {
        [$class, , $editable] = $this->definition($request);
        abort_unless($editable, 405);
        $model = $class::findOrFail($id);
        if ($model instanceof TenantDatabasePool) {
            $this->abortIfPoolDatabaseAllocated($model, 'Allocated tenant databases cannot be removed.');
        }
        $audit->log($request, $request->route('resource').'.deleted', $model, $this->auditableAttributes($model));
        $model->delete();

        return back()->with('success', 'Resource removed.');
    }

    public function revalidateTenantDatabase(Request $request, int $id, CentralAuditService $audit)
    {
        $model = TenantDatabasePool::findOrFail($id);
        $this->abortIfPoolDatabaseAllocated($model, 'Allocated tenant databases cannot be revalidated.');
        $old = $model->getAttributes();
        $model->update($this->validatedPoolDatabase($model->only(['database_name', 'username', 'password']), $model));
        $audit->log($request, 'tenant-databases.revalidated', $model, $this->auditableAttributes($model, $old), $this->auditableAttributes($model));

        return back()->with('success', 'Tenant database revalidated.');
    }

    public function subscriptionAction(Request $request, Subscription $subscription, SubscriptionService $service, CentralAuditService $audit)
    {
        $action = $request->validate(['action' => ['required', Rule::in(['cancel', 'cancel_now', 'reactivate', 'pause', 'renew'])]])['action'];
        $old = $subscription->only(['status', 'ends_at', 'current_period_ends_at']);
        match ($action) {
            'cancel' => $service->cancel($subscription), 'cancel_now' => $service->cancel($subscription, true), 'reactivate' => $service->reactivate($subscription), 'pause' => $service->pause($subscription), 'renew' => $service->renew($subscription)
        };
        if (in_array($action, ['cancel', 'cancel_now'], true)) {
            app(CentralNotificationService::class)->notifyOnce('subscription_cancelled', 'subscriptions', 'warning', 'Subscription cancelled', 'Subscription #'.$subscription->id.' for tenant '.$subscription->tenant_id.' was cancelled.', route('central.subscriptions.index', ['search' => $subscription->tenant_id]), $subscription, ['action' => $action], 1);
        }
        $audit->log($request, 'subscription.'.$action, $subscription, $old, $subscription->fresh()->only(['status', 'ends_at', 'current_period_ends_at']));

        return back()->with('success', 'Subscription updated.');
    }

    public function approveManualPayment(Request $request, TenantInvoice $invoice, ManualPaymentService $payments)
    {
        abort_if($invoice->status === 'paid', 409, 'Invoice is already paid.');
        $data = $request->validate(['amount' => ['nullable', 'numeric', 'min:0.01'], 'reference' => ['required', 'string', 'max:255']]);
        $payments->markPaid($invoice, $data);

        return back()->with('success', 'Manual payment approved.');
    }

    public function invoicePdf(TenantInvoice $invoice)
    {
        return Pdf::loadView('central.invoice', ['invoice' => $invoice->load('lines')])->download($invoice->invoice_number.'.pdf');
    }

    public function refund(Request $request, PaymentTransaction $payment, PaymentManager $payments, CentralAuditService $audit)
    {
        $settings = app(PlatformSettingsService::class);
        abort_unless($settings->get('billing.refunds', true), 403, 'Refunds are disabled in billing settings.');
        if ($settings->get('security.require_mfa_for_refunds', true)) {
            $verifiedAt = (int) $request->session()->get('central_mfa_verified_at', 0);
            abort_unless(filled($request->user('central')->mfa_secret) && $verifiedAt > 0, 403, 'Sign in with MFA before issuing a refund.');
        }
        $data = $request->validate(['amount' => ['required', 'numeric', 'min:0.01'], 'idempotency_key' => ['nullable', 'string', 'max:255'], 'reason' => ['required', 'string', 'min:10', 'max:1000'], 'current_password' => ['required', 'string']]);
        abort_unless(Hash::check($data['current_password'], $request->user('central')->password), 422, 'The administrator password is incorrect.');
        $key = $data['idempotency_key'] ?? (string) Str::uuid();
        if ($existing = PaymentRefund::where('idempotency_key', $key)->first()) {
            return back()->with('success', 'Refund already processed.');
        }
        $maximumPeriod = (int) $settings->get('billing.maximum_refund_period', 90);
        abort_if($maximumPeriod > 0 && $payment->paid_at?->lt(now()->subDays($maximumPeriod)), 409, 'The maximum refund period has elapsed.');
        abort_if($payment->status !== 'success' || $payment->refunded_amount + $data['amount'] > $payment->amount, 409, 'Refund amount is invalid.');
        try {
            $result = $payments->driver($payment->gateway)->refund($payment->gateway_transaction_id ?: (string) $payment->id, (float) $data['amount']);
        } catch (\Throwable $exception) {
            app(CentralNotificationService::class)->notify('refund_failed', 'billing', 'critical', 'Refund failed', 'Refund for payment '.($payment->reference ?: '#'.$payment->id).' could not be completed.', route('central.payments.index', ['search' => $payment->reference ?: $payment->id]), $payment);
            throw $exception;
        }
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($payment, $data, $key, $result): void {
            $locked = PaymentTransaction::lockForUpdate()->findOrFail($payment->id);
            $total = $locked->refunded_amount + $data['amount'];
            PaymentRefund::create(['payment_transaction_id' => $locked->id, 'gateway_refund_id' => $result['id'] ?? $result['refund_id'] ?? null, 'amount' => $data['amount'], 'status' => $result['status'] ?? 'succeeded', 'idempotency_key' => $key, 'response' => $result]);
            $locked->update(['refunded_amount' => $total, 'status' => $total >= $locked->amount ? 'refunded' : $locked->status]);
        });
        app(CentralNotificationService::class)->notify('refund_completed', 'billing', 'success', 'Refund completed', $payment->currency.' '.number_format((float) $data['amount'], 2).' was refunded for payment '.($payment->reference ?: '#'.$payment->id).'.', route('central.payments.index', ['search' => $payment->reference ?: $payment->id]), $payment);
        $audit->log($request, 'payment.refunded', $payment, [], ['amount' => $data['amount'], 'idempotency_key' => $key, 'reason' => $data['reason']]);

        return back()->with('success', 'Refund processed.');
    }

    private function definition(Request $request): array
    {
        $definition = self::RESOURCES[$request->route('resource')] ?? null;
        abort_unless($definition, 404);

        return array_pad($definition, 4, null);
    }

    private function rules(string $resource, ?Model $model = null): array
    {
        return match ($resource) {
            'default-templates' => ['name' => ['required', 'string'], 'slug' => ['required', 'alpha_dash', Rule::unique('default_data_templates')->ignore($model)], 'description' => ['nullable', 'string'], 'country' => ['nullable', 'string', 'size:2'], 'industry' => ['nullable', 'string'], 'is_default' => ['boolean'], 'is_active' => ['boolean']],
            'tenant-databases' => ['database_name' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('tenant_database_pool')->ignore($model)], 'username' => ['nullable', 'string', 'max:128'], 'password' => ['nullable', 'string', 'max:1024']],
            default => [],
        };
    }

    private function validatedPoolDatabase(array $data, ?TenantDatabasePool $model = null): array
    {
        try {
            return app(PoolDatabaseValidator::class)->validate([
                'database_name' => $data['database_name'],
                'username' => $data['username'] ?? $model?->username,
                'password' => $data['password'] ?? $model?->password,
            ]);
        } catch (\RuntimeException $e) {
            $message = match ($e->getMessage()) {
                'central_database_rejected' => 'The central database cannot be registered as a tenant pool database.',
                'database_already_owned' => 'This database is already assigned to a tenant and cannot be registered in the pool.',
                'pool_database_not_empty' => 'The tenant database must be empty before it can be added to the pool.',
                default => 'The tenant database validation failed. Create the database, assign full table privileges, and verify the credentials.',
            };

            throw ValidationException::withMessages(['database_name' => $message]);
        }
    }

    private function auditableAttributes(Model $model, ?array $attributes = null): array
    {
        $attributes ??= $model->getAttributes();

        return $model instanceof TenantDatabasePool
            ? collect($attributes)->except(['username', 'password'])->all()
            : $attributes;
    }

    private function abortIfPoolDatabaseAllocated(TenantDatabasePool $database, string $message): void
    {
        abort_if($database->tenant_id !== null || $database->status === 'allocated', 409, $message);
    }

    /** @return array{available:int,allocated:int,failed:int,total:int} */
    private function tenantDatabaseSummary(): array
    {
        return [
            'available' => TenantDatabasePool::query()->where('status', 'available')->whereNotNull('validated_at')->count(),
            'allocated' => TenantDatabasePool::query()->whereNotNull('tenant_id')->orWhere('status', 'allocated')->count(),
            'failed' => TenantDatabasePool::query()->where('status', 'failed')->count(),
            'total' => TenantDatabasePool::query()->count(),
        ];
    }
}
