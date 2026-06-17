<?php

namespace App\Http\Controllers\Api;

use App\Models\AlertType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AlertTypeController extends BaseCrudApiController
{
    protected string $modelClass = AlertType::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['name', 'alert_type', 'recipient', 'medium', 'schedule'];

    protected array $filterable = ['medium', 'schedule', 'alert_type', 'recipient'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = [
        'id',
        'name',
        'medium',
        'alert_type',
        'schedule',
        'sync_time',
        'active',
        'is_system_generated',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'name';

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:150'],
        'medium' => ['required', 'in:email,sms,whatsapp,in_app'],
        'alert_type' => ['required', 'string', 'max:80'],
        'schedule' => ['required', 'in:immediate,daily,weekly,monthly'],
        'sync_time' => ['nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
        'recipient' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'medium' => ['sometimes', 'required', 'in:email,sms,whatsapp,in_app'],
            'alert_type' => ['sometimes', 'required', 'string', 'max:80'],
            'schedule' => ['sometimes', 'required', 'in:immediate,daily,weekly,monthly'],
            'sync_time' => ['sometimes', 'nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
            'recipient' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function prepareIncomingPayload(array $data): array
    {
        $data = parent::prepareIncomingPayload($data);

        if (array_key_exists('sync_time', $data) && $data['sync_time']) {
            $data['sync_time'] = $this->normalizeSyncTime($data['sync_time']);
        }

        return $data;
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        $parentData['active'] = $parentData['active'] ?? true;
        $parentData['is_system_generated'] = $parentData['is_system_generated'] ?? false;

        return $parentData;
    }

    protected function normalizeSyncTime(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $value = trim((string) $value);

        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value)) {
            return "{$value}:00";
        }

        return $value;
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        if ((bool) $record->is_system_generated) {
            return response()->json([
                'message' => 'System generated alert types cannot be deleted.',
            ], 422);
        }

        return parent::destroy($request, $id);
    }

    public function bulkDestroy(Request $request)
    {
        $this->checkAccess($request, 'bulkDestroy');

        $data = $this->validateCompat($request->all(), [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required'],
        ]);

        $ids = array_values(array_unique($data['ids']));

        $records = AlertType::query()
            ->whereIn('id', $ids)
            ->get();

        if ($records->count() !== count($ids)) {
            $this->throwValidation([
                'ids' => ['One or more records were not found.'],
            ]);
        }

        if ($records->contains(fn (AlertType $record) => (bool) $record->is_system_generated)) {
            return response()->json([
                'message' => 'System generated alert types cannot be deleted.',
            ], 422);
        }

        DB::transaction(fn () => $records->each->delete());

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }
}
