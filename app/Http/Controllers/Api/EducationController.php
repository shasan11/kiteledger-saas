<?php

namespace App\Http\Controllers\Api;

use App\Models\Education;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class EducationController extends BaseCrudApiController
{
    protected string $modelClass = Education::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'user',
    ];

    protected array $relationDetails = [
        'user' => 'user_id',
    ];

    protected array $searchable = [
        'degree',
        'institution',
        'field_of_study',
        'result',
        'user.first_name',
        'user.last_name',
        'user.username',
        'user.email',
    ];

    protected array $filterable = [
        'user_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $dateRangeFilters = [
        'study_start_date' => ['from' => 'study_start_date_from', 'to' => 'study_start_date_to'],
        'study_end_date' => ['from' => 'study_end_date_from', 'to' => 'study_end_date_to'],
    ];

    protected array $sortable = [
        'id',
        'user_id',
        'degree',
        'institution',
        'study_start_date',
        'study_end_date',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-study_start_date';

    protected array $storeRules = [
        'user_id' => ['required', 'integer', 'exists:users,id'],
        'degree' => ['required', 'string', 'max:120'],
        'institution' => ['required', 'string', 'max:180'],
        'field_of_study' => ['required', 'string', 'max:120'],
        'result' => ['required', 'string', 'max:60'],
        'study_start_date' => ['required', 'date'],
        'study_end_date' => ['nullable', 'date', 'after_or_equal:study_start_date'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'degree' => ['sometimes', 'required', 'string', 'max:120'],
            'institution' => ['sometimes', 'required', 'string', 'max:180'],
            'field_of_study' => ['sometimes', 'required', 'string', 'max:120'],
            'result' => ['sometimes', 'required', 'string', 'max:60'],
            'study_start_date' => ['sometimes', 'required', 'date'],
            'study_end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:study_start_date'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
