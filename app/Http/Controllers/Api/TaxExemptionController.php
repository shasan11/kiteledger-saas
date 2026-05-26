<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxExemption;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaxExemptionController extends BaseCrudApiController
{
    protected string $modelClass = TaxExemption::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = ['contact', 'productTaxCategory'];

    protected array $relationDetails = [
        'contact' => 'contact_id',
        'productTaxCategory' => 'product_tax_category_id',
    ];

    protected array $searchable = ['exemption_no', 'reason'];

    protected array $filterable = ['contact_id', 'product_tax_category_id', 'country_code'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'effective_from' => ['from' => 'effective_from_start', 'to' => 'effective_from_end'],
    ];

    protected array $sortable = ['id', 'exemption_no', 'effective_from', 'effective_to', 'created_at', 'updated_at'];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
        'product_tax_category_id' => ['nullable', 'uuid', 'exists:product_tax_categories,id'],
        'country_code' => ['required', 'string', 'size:2'],
        'exemption_no' => ['nullable', 'string', 'max:80'],
        'reason' => ['nullable', 'string', 'max:180'],
        'effective_from' => ['nullable', 'date'],
        'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
        'attachment' => ['nullable', 'string', 'max:255'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'contact_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
            'product_tax_category_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_tax_categories,id'],
            'country_code' => ['sometimes', 'required', 'string', 'size:2'],
            'exemption_no' => ['sometimes', 'nullable', 'string', 'max:80'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:180'],
            'effective_from' => ['sometimes', 'nullable', 'date'],
            'effective_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:effective_from'],
            'attachment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
