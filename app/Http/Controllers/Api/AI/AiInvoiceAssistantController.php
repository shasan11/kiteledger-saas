<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\Modules\AiInvoiceAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiInvoiceAssistantController extends Controller
{
    public function __construct(protected AiInvoiceAssistantService $service) {}

    public function draftLines(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'instruction'  => 'required|string|max:2000',
            'customer_id'  => 'nullable|uuid',
            'warehouse_id' => 'nullable|uuid',
            'currency_id'  => 'nullable|uuid',
        ]);

        $result = $this->service->draftLines($validated);

        return response()->json($result);
    }

    public function explain(Request $request, string $id): JsonResponse
    {
        $result = $this->service->explain($id);

        return response()->json($result);
    }
}
