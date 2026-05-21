<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\Modules\AiTransactionReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiTransactionReviewController extends Controller
{
    public function __construct(protected AiTransactionReviewService $service) {}

    public function review(Request $request, string $module, string $id): JsonResponse
    {
        $result = $this->service->review($module, $id);

        return response()->json($result);
    }
}
