<?php

namespace App\Http\Controllers\Api;

use App\Models\ProductVariantItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductVariantItemController extends BaseCrudApiController
{
    protected string $modelClass = ProductVariantItem::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = ['product', 'variantLine'];

    protected array $relationDetails = [
        'product' => 'product_id',
        'variantLine' => 'variant_line_id',
    ];

    protected array $filterable = ['product_id', 'variant_line_id'];

    protected array $sortable = ['id', 'product_id', 'variant_line_id', 'created_at', 'updated_at'];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'product_id' => ['required', 'uuid', 'exists:products,id'],
        'variant_line_id' => ['required', 'uuid', 'exists:variant_lines,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'product_id' => ['sometimes', 'required', 'uuid', 'exists:products,id'],
            'variant_line_id' => ['sometimes', 'required', 'uuid', 'exists:variant_lines,id'],
        ];
    }
}
