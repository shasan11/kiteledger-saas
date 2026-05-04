<?php

namespace App\Http\Controllers\Api;

use App\Models\ReportingTag;
use App\Models\ReportingTagLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ReportingTagController extends BaseCrudApiController
{
    protected string $modelClass = ReportingTag::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = ['reportingTagLines'];

    protected array $searchable = ['name', 'description'];

    protected array $filterable = [];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'created_at', 'updated_at'];

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
                'color' => ['nullable', 'string', 'max:20'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'name' => ['required', 'string', 'max:80'],
                'color' => ['nullable', 'string', 'max:20'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:80'],
        'color' => ['nullable', 'string', 'max:20'],
        'description' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'color' => ['sometimes', 'nullable', 'string', 'max:20'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
