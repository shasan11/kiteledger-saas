<?php

namespace App\Http\Controllers\Api;

use App\Models\ReportingTag;
use App\Models\ReportingTagLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ReportingTagController extends BaseCrudApiController
{
    protected string $modelClass = ReportingTag::class;

    protected ?string $permissionPrefix = 'reporting_tag';

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = ['reportingTagLines'];

    protected array $searchable = ['name', 'code', 'description'];

    protected array $filterable = [];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'type', 'sort_order', 'created_at', 'updated_at'];

    protected string $defaultSort = 'name';

    protected array $nested = [
        'lines' => [
            'relation' => 'reportingTagLines',
            'model' => ReportingTagLine::class,
            'foreign_key' => 'reporting_tag_id',
            'delete_key' => 'deleted_line_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'name' => ['required', 'string', 'max:80'],
                'value' => ['nullable', 'string', 'max:120'],
                'color' => ['nullable', 'string', 'max:20'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'name' => ['required', 'string', 'max:80'],
                'value' => ['nullable', 'string', 'max:120'],
                'color' => ['nullable', 'string', 'max:20'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:80'],
        'code' => ['nullable', 'string', 'max:80'],
        'type' => ['required', 'in:text,number,date,select,multi_select,boolean'],
        'color' => ['nullable', 'string', 'max:20'],
        'sort_order' => ['nullable', 'integer', 'min:0'],
        'description' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'code' => ['sometimes', 'nullable', 'string', 'max:80'],
            'type' => ['sometimes', 'required', 'in:text,number,date,select,multi_select,boolean'],
            'color' => ['sometimes', 'nullable', 'string', 'max:20'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        return $this->normalizeParentData($parentData, $nestedData);
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $type = $parentData['type'] ?? $record->type ?? 'text';
        return $this->normalizeParentData([...$parentData, 'type' => $type], $nestedData);
    }

    private function normalizeParentData(array $parentData, array $nestedData): array
    {
        $type = $parentData['type'] ?? 'text';
        $hasOptions = in_array($type, ['select', 'multi_select'], true);
        $lines = $nestedData['lines'] ?? [];

        if ($hasOptions && count($lines) < 1) {
            $this->throwValidation(['lines' => ['Options are required for Select and Multi Select tags.']]);
        }

        if ($hasOptions) {
            $labels = collect($lines)->pluck('name')->filter()->map(fn ($value) => mb_strtolower(trim($value)));
            $values = collect($lines)->map(fn ($line) => $line['value'] ?? $line['name'] ?? null)->filter()->map(fn ($value) => mb_strtolower(trim($value)));

            if ($labels->count() !== $labels->unique()->count()) {
                $this->throwValidation(['lines' => ['Option labels must be unique.']]);
            }

            if ($values->count() !== $values->unique()->count()) {
                $this->throwValidation(['lines' => ['Option values must be unique.']]);
            }
        }

        return $parentData;
    }
}
