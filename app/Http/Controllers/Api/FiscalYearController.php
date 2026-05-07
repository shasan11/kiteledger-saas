<?php

namespace App\Http\Controllers\Api;

use App\Models\FiscalYear;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FiscalYearController extends BaseCrudApiController
{
    protected string $modelClass = FiscalYear::class;
    protected bool $branchScoped = false;
    protected array $searchable = ['name', 'code', 'status'];
    protected array $filterable = ['status'];
    protected array $booleanFilters = ['active', 'is_current', 'is_system_generated'];
    protected array $sortable = ['name', 'code', 'start_date', 'end_date', 'status', 'is_current', 'created_at'];
    protected string $defaultSort = '-start_date';

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:80'],
        'code' => ['nullable', 'string', 'max:40', 'unique:fiscal_years,code'],
        'start_date' => ['required', 'date'],
        'end_date' => ['required', 'date', 'after:start_date'],
        'status' => ['nullable', 'in:DRAFT,ACTIVE,CLOSED'],
        'lock_date' => ['nullable', 'date'],
        'is_current' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        $rules = $this->makeRulesPartial($this->storeRules);
        $rules['code'] = ['sometimes', 'nullable', 'string', 'max:40', 'unique:fiscal_years,code,' . $record->id . ',id'];
        return $rules;
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        if ($record->is_current || $record->status === 'ACTIVE') {
            DB::table('fiscal_years')
                ->where('id', '!=', $record->id)
                ->update(['is_current' => false, 'status' => DB::raw("CASE WHEN status = 'ACTIVE' THEN 'DRAFT' ELSE status END")]);
        }

        return $record;
    }

    public function markCurrent(Request $request, string $id)
    {
        $record = FiscalYear::query()->findOrFail($id);
        $this->checkAccess($request, 'update', $record);

        DB::transaction(function () use ($record) {
            FiscalYear::query()->whereKeyNot($record->id)->update(['is_current' => false]);
            $record->update(['is_current' => true, 'status' => 'ACTIVE', 'active' => true]);
        });

        return response()->json($this->serializeRecord($record->fresh()));
    }

    public function close(Request $request, string $id)
    {
        $record = FiscalYear::query()->findOrFail($id);
        $this->checkAccess($request, 'update', $record);
        $record->update(['status' => 'CLOSED', 'is_current' => false, 'lock_date' => $record->lock_date ?? now()->toDateString()]);

        return response()->json($this->serializeRecord($record->fresh()));
    }
}
