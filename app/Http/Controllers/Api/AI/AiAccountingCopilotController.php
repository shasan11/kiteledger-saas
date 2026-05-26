<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\Modules\AiAccountingCopilotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAccountingCopilotController extends Controller
{
    public function __construct(protected AiAccountingCopilotService $service) {}

    public function explainJournal(Request $request, string $id): JsonResponse
    {
        $result = $this->service->explainJournal($id);

        return response()->json($result);
    }

    public function suggestAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'description'      => 'required|string|max:500',
            'transaction_type' => 'nullable|string|max:100',
            'amount'           => 'nullable|numeric',
        ]);

        $result = $this->service->suggestAccount($validated);

        return response()->json($result);
    }
}
