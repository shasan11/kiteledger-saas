<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->centrallyManaged();
    }

    public function update(Request $request): JsonResponse
    {
        return $this->centrallyManaged();
    }

    public function test(Request $request): JsonResponse
    {
        return $this->centrallyManaged();
    }

    public function testConnection(Request $request): JsonResponse
    {
        return $this->test($request);
    }

    private function centrallyManaged(): JsonResponse
    {
        return response()->json([
            'message' => 'AI provider settings are managed by the central administrator.',
            'code' => 'AI_SETTINGS_CENTRALLY_MANAGED',
        ], 403);
    }
}
