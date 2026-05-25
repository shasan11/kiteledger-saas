<?php

namespace App\Http\Controllers\Api;

use App\Models\OnlinePayment;
use App\Services\Payments\OnlineInvoicePaymentService;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\Request;

class OnlinePaymentController extends BaseCrudApiController
{
    protected string $modelClass = OnlinePayment::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = false;

    protected array $relations = ['invoice', 'contact', 'currency', 'customerPayment'];
    protected array $relationDetails = [
        'invoice' => 'invoice_id',
        'contact' => 'contact_id',
        'currency' => 'currency_id',
        'customerPayment' => 'customer_payment_id',
    ];

    protected array $searchable = ['provider', 'provider_payment_id', 'provider_order_id', 'customer_name', 'customer_email', 'status'];
    protected array $filterable = ['provider', 'status', 'contact_id', 'invoice_id'];
    protected array $dateRangeFilters = ['paid_at' => ['from' => 'date_from', 'to' => 'date_to']];
    protected string $defaultSort = '-created_at';
    protected array $storeRules = [];

    protected function updateRules(Request $request, \Illuminate\Database\Eloquent\Model $record): array
    {
        return [];
    }

    public function refund(Request $request, string $id)
    {
        $record = OnlinePayment::findOrFail($id);

        if (!$record->isSucceeded()) {
            return response()->json(['message' => 'Only succeeded payments can be refunded.'], 422);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        try {
            $gateway = app(PaymentGatewayManager::class)->driver($record->provider);
            $result = $gateway->refundPayment($record, (float) $validated['amount']);

            if ($result['success']) {
                $record->forceFill([
                    'status' => OnlinePayment::STATUS_REFUNDED,
                ])->save();

                return response()->json(['success' => true, 'refund_id' => $result['refund_id'] ?? null]);
            }

            return response()->json(['success' => false, 'message' => $result['reason'] ?? 'Refund failed.'], 422);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function webhookLogs(Request $request, string $id)
    {
        $record = OnlinePayment::findOrFail($id);

        $logs = $record->webhookLogs()
            ->orderBy('received_at', 'desc')
            ->limit(50)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'event_id' => $log->event_id,
                'event_type' => $log->event_type,
                'verified' => $log->verified,
                'processed' => $log->processed,
                'processing_error' => $log->processing_error,
                'received_at' => $log->received_at?->toISOString(),
                'processed_at' => $log->processed_at?->toISOString(),
            ]);

        return response()->json(['data' => $logs]);
    }
}
