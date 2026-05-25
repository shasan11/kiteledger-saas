<?php

namespace App\Http\Controllers\Api;

use App\Models\ProductTaxCategory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductTaxCategoryController extends BaseCrudApiController
{
    protected string $modelClass = ProductTaxCategory::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['code', 'name', 'hsn_sac_code', 'description'];

    protected array $filterable = ['country_code', 'tax_category_type'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'code', 'name', 'country_code', 'tax_category_type', 'created_at', 'updated_at'];

    protected string $defaultSort = 'code';

    protected array $storeRules = [
        'country_code' => ['required', 'string', 'size:2'],
        'code' => ['required', 'string', 'max:80'],
        'name' => ['required', 'string', 'max:180'],
        'tax_category_type' => ['required', 'in:goods,service,expense,exempt,zero_rated,non_taxable'],
        'hsn_sac_code' => ['nullable', 'string', 'max:30'],
        'description' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'country_code' => ['sometimes', 'required', 'string', 'size:2'],
            'code' => ['sometimes', 'required', 'string', 'max:80'],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'tax_category_type' => ['sometimes', 'required', 'in:goods,service,expense,exempt,zero_rated,non_taxable'],
            'hsn_sac_code' => ['sometimes', 'nullable', 'string', 'max:30'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
