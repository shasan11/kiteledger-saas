<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\TaxSlab;

class TaxSlabController extends BaseCrudApiController
{
    protected string $modelClass = TaxSlab::class;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected array $searchable = ['country', 'fiscal_year'];
    protected array $filterable = ['country', 'fiscal_year'];

    protected array $storeRules = [
        'country' => ['required', 'string', 'max:100'],
        'fiscal_year' => ['required', 'string', 'max:40'],
        'income_from' => ['required', 'numeric', 'min:0'],
        'income_to' => ['nullable', 'numeric', 'gte:income_from'],
        'rate' => ['required', 'numeric', 'min:0'],
        'fixed_amount' => ['nullable', 'numeric', 'min:0'],
        'active' => ['nullable', 'boolean'],
    ];
}
