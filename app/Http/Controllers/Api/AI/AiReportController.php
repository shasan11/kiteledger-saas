<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\AiReportAnalyzer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiReportController extends Controller
{
    public function __construct(protected AiReportAnalyzer $analyzer) {}

    public function ask(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question'   => 'required|string|max:1000',
            'category'   => 'required|string|max:60',
            'report_key' => 'required|string|max:120',
            'filters'    => 'nullable|array',
        ]);

        $result = $this->analyzer->ask(
            $data['question'],
            $data['category'],
            $data['report_key'],
            $data['filters'] ?? [],
        );

        return response()->json($result);
    }
}
