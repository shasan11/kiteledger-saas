<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\Modules\AiReportInsightService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiReportInsightController extends Controller
{
    public function __construct(protected AiReportInsightService $service) {}

    public function explain(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category'    => 'required|string|max:100',
            'report_key'  => 'required|string|max:100',
            'filters'     => 'nullable|array',
            'report_data' => 'nullable|array',
        ]);

        $result = $this->service->explain($validated);

        return response()->json($result);
    }
}
