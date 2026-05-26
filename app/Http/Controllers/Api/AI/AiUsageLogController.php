<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AiUsageLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user || !$user->hasPermissionTo('ai.logs.view')) {
            abort(403, 'You do not have permission to view AI logs.');
        }

        $query = AiUsageLog::query()
            ->orderByDesc('created_at');

        if ($request->has('module')) {
            $query->where('module', $request->module);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $pageSize = min((int) $request->query('per_page', 20), 100);
        $logs = $query->paginate($pageSize);

        // Summary stats
        $stats = [
            'total_requests' => AiUsageLog::where('status', 'success')->count(),
            'total_tokens'   => AiUsageLog::where('status', 'success')->sum('total_tokens'),
            'today_requests' => AiUsageLog::where('status', 'success')
                ->whereDate('created_at', now()->toDateString())
                ->count(),
        ];

        return response()->json([
            'data'    => $logs->items(),
            'meta'    => [
                'total'        => $logs->total(),
                'per_page'     => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
            ],
            'stats'   => $stats,
        ]);
    }
}
