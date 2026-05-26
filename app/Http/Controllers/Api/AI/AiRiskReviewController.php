<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\AiRiskAnalyzer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiRiskReviewController extends Controller
{
    public function __construct(protected AiRiskAnalyzer $analyzer) {}

    public function review(Request $request): JsonResponse
    {
        $data = $request->validate([
            'module'    => 'required|string|max:60',
            'record_id' => 'required|string|max:64',
        ]);

        $review = $this->analyzer->reviewRecord($data['module'], $data['record_id']);

        return response()->json($review->toArray());
    }
}
