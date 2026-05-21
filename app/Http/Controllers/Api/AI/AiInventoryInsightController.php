<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\Modules\AiInventoryInsightService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiInventoryInsightController extends Controller
{
    public function __construct(protected AiInventoryInsightService $service) {}

    public function insights(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id'    => 'nullable|uuid',
            'warehouse_id' => 'nullable|uuid',
        ]);

        $result = $this->service->insights($validated);

        return response()->json($result);
    }
}
