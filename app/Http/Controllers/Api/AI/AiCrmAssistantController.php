<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\Modules\AiCrmAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiCrmAssistantController extends Controller
{
    public function __construct(protected AiCrmAssistantService $service) {}

    public function followUp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type'    => 'required|string|in:lead,deal,contact',
            'id'      => 'required|uuid',
            'tone'    => 'nullable|string|in:professional,friendly,short',
            'channel' => 'nullable|string|in:email,whatsapp,sms',
        ]);

        $result = $this->service->followUp($validated);

        return response()->json($result);
    }
}
