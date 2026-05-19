<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesProjectResources;
use App\Models\TaskStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaskStatusController extends BaseCrudApiController
{
    use AuthorizesProjectResources;

    protected string $modelClass = TaskStatus::class;

    protected ?string $permissionPrefix = 'project.task_status';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'project',
    ];

    protected array $relationDetails = [
        'project' => 'project_id',
    ];

    protected array $searchable = [
        'name',
        'color',
        'project.name',
    ];

    protected array $filterable = [
        'project_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'project_id',
        'name',
        'color',
        'sort_order',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'sort_order';

    protected array $storeRules = [
        'project_id' => ['required', 'uuid', 'exists:projects,id'],
        'name' => ['required', 'string', 'max:80'],
        'color' => ['nullable', 'string', 'max:20'],
        'sort_order' => ['nullable', 'integer', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'project_id' => ['sometimes', 'required', 'uuid', 'exists:projects,id'],
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'color' => ['sometimes', 'nullable', 'string', 'max:20'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        $this->ensureUniqueStatusName($parentData['project_id'] ?? null, $parentData['name'] ?? null);

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        $parentData = parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
        $this->ensureUniqueStatusName(
            $parentData['project_id'] ?? $record->project_id,
            $parentData['name'] ?? $record->name,
            $record->getKey()
        );

        return $parentData;
    }

    protected function afterSave(
        Model $record,
        array $parentData,
        array $nestedData,
        bool $isUpdate
    ): Model {
        $record = parent::afterSave($record, $parentData, $nestedData, $isUpdate);
        $this->normalizeSortOrder($record->project_id);

        return $record;
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        if ($record->tasks()->exists()) {
            return response()->json([
                'message' => 'Cannot delete this status because tasks are using it.',
            ], 422);
        }

        return parent::destroy($request, $id);
    }

    protected function normalizeSortOrder(string $projectId): void
    {
        TaskStatus::query()
            ->where('project_id', $projectId)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get()
            ->values()
            ->each(function (TaskStatus $status, int $index) {
                $expected = $index + 1;

                if ((int) $status->sort_order !== $expected) {
                    $status->forceFill(['sort_order' => $expected])->saveQuietly();
                }
            });
    }

    protected function ensureUniqueStatusName(?string $projectId, ?string $name, ?string $ignoreId = null): void
    {
        if (!$projectId || !$name) {
            return;
        }

        $query = TaskStatus::query()
            ->where('project_id', $projectId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)]);

        if ($ignoreId) {
            $query->whereKeyNot($ignoreId);
        }

        if ($query->exists()) {
            $this->throwValidation([
                'name' => ['This status name already exists for this project.'],
            ]);
        }
    }
}
