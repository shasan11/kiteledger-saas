<?php

namespace App\Http\Controllers\Api;

use App\Models\Currency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CurrencyController extends BaseCrudApiController
{
    protected string $modelClass = Currency::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = false;

    protected array $searchable = ['code', 'name', 'symbol'];
    protected array $filterable = [];
    protected array $booleanFilters = ['active', 'is_base', 'is_system_generated'];
    protected array $sortable = ['id', 'code', 'name', 'is_base', 'active', 'created_at'];
    protected string $defaultSort = 'code';

    protected array $storeRules = [
        'code'                => ['required', 'string', 'max:10', 'unique:currencies,code'],
        'name'                => ['required', 'string', 'max:80'],
        'symbol'              => ['nullable', 'string', 'max:10'],
        'decimal_places'      => ['nullable', 'integer', 'min:0', 'max:8'],
        'exchange_rate'=> ['nullable', 'numeric', 'min:0'],
        'is_base'             => ['nullable', 'boolean'],
        'active'              => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id'         => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'code'                => ['sometimes', 'required', 'string', 'max:10', 'unique:currencies,code,' . $record->id . ',id'],
            'name'                => ['sometimes', 'required', 'string', 'max:80'],
            'symbol'              => ['sometimes', 'nullable', 'string', 'max:10'],
            'decimal_places'      => ['sometimes', 'nullable', 'integer', 'min:0', 'max:8'],
            'exchange_rate'=> ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_base'             => ['sometimes', 'nullable', 'boolean'],
            'active'              => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'         => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $label = trim(sprintf(
            '%s - %s%s',
            (string) ($record->code ?? ''),
            (string) ($record->name ?? ''),
            filled($record->symbol) ? ' ('.$record->symbol.')' : ''
        ));

        $data['label'] = $label !== '-' ? $label : 'Selected currency';
        $data['value'] = $record->getKey();

        return $data;
    }
}
