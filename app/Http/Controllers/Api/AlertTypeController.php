<?php

namespace App\Http\Controllers\Api;

use App\Models\AlertType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AlertTypeController extends BaseCrudApiController
{
    protected string $modelClass = AlertType::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['name', 'alert_type', 'recipient'];

    protected array $filterable = ['medium', 'schedule', 'alert_type'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'medium', 'schedule', 'created_at', 'updated_at'];

    protected string $defaultSort = 'name';

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:150'],
        'medium' => ['nullable', 'in:email,sms,whatsapp,in_app'],
        'alert_type' => ['nullable', 'string', 'max:80'],
        'schedule' => ['nullable', 'in:immediate,daily,weekly,monthly'],
        'sync_time' => ['nullable', 'date_format:H:i:s'],
        'recipient' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'medium' => ['sometimes', 'nullable', 'in:email,sms,whatsapp,in_app'],
            'alert_type' => ['sometimes', 'nullable', 'string', 'max:80'],
            'schedule' => ['sometimes', 'nullable', 'in:immediate,daily,weekly,monthly'],
            'sync_time' => ['sometimes', 'nullable', 'date_format:H:i:s'],
            'recipient' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
