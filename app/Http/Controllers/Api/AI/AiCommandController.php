<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\Modules\AiCommandService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiCommandController extends Controller
{
    public function __construct(protected AiCommandService $service) {}

    public function handle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message'   => 'required|string|max:1000',
            'branch_id' => 'nullable|uuid',
        ]);

        $result = $this->service->handle($validated);

        return response()->json($result);
    }
}
