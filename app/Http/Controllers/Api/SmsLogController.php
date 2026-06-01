<?php

namespace App\Http\Controllers\Api;

use App\Models\SmsLog;
use App\Services\Sms\SmsSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class SmsLogController extends BaseCrudApiController
{
    protected string $modelClass = SmsLog::class;
    protected ?string $permissionPrefix = 'sms_log';
    protected array $relations = ['config', 'template', 'campaign'];
    protected array $searchable = ['phone', 'normalized_phone', 'message', 'recipient_name', 'provider', 'error_message'];
    protected array $filterable = ['provider', 'status', 'module', 'campaign_id'];
    protected array $dateRangeFilters = ['created_at', 'sent_at', 'failed_at'];
    protected array $sortable = ['created_at', 'sent_at', 'failed_at', 'status', 'provider'];
    protected string $defaultSort = '-created_at';

    public function retry(Request $request, string $id, SmsSender $sender): JsonResponse
    {
        $this->checkAccess($request, 'retry');
        $log = SmsLog::query()->findOrFail($id);
        $result = $sender->retry($log);

        return response()->json([
            'success' => $result->success,
            'provider' => $result->provider,
            'provider_message_id' => $result->providerMessageId,
            'error' => $result->error,
        ], $result->success ? 200 : 422);
    }

    public function bulkRetry(Request $request, SmsSender $sender): JsonResponse
    {
        $this->checkAccess($request, 'retry');
        $data = $request->validate(['ids' => ['nullable', 'array'], 'ids.*' => ['uuid']]);
        $query = SmsLog::query()->where('status', 'failed');
        if (!empty($data['ids'])) {
            $query->whereIn('id', $data['ids']);
        }

        $sent = $failed = 0;
        foreach ($query->limit(100)->get() as $log) {
            $sender->retry($log)->success ? $sent++ : $failed++;
        }

        return response()->json(compact('sent', 'failed'));
    }

    public function export(Request $request)
    {
        $this->checkAccess($request, 'export');
        $rows = SmsLog::query()->latest()->limit(5000)->get()->map(fn (SmsLog $log) => [
            'created_at' => optional($log->created_at)->toDateTimeString(),
            'recipient_name' => $log->recipient_name,
            'phone' => $log->phone,
            'normalized_phone' => $log->normalized_phone,
            'provider' => $log->provider,
            'sender_id' => $log->sender_id,
            'module' => $log->module,
            'status' => $log->status,
            'message' => $log->message,
            'error_message' => $log->error_message,
            'provider_message_id' => $log->provider_message_id,
        ])->all();

        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, array_keys($rows[0] ?? ['created_at' => null, 'phone' => null, 'status' => null]));
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return Response::make($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="sms-logs.csv"',
        ]);
    }
}
