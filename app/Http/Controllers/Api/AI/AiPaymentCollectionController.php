<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\Modules\AiPaymentCollectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiPaymentCollectionController extends Controller
{
    public function __construct(protected AiPaymentCollectionService $service) {}

    public function collectionPlan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id'      => 'nullable|uuid',
            'branch_id'        => 'nullable|uuid',
            'date_from'        => 'nullable|date',
            'date_to'          => 'nullable|date',
            'min_overdue_days' => 'nullable|integer|min:1',
        ]);

        $result = $this->service->collectionPlan($validated);

        return response()->json($result);
    }
}
