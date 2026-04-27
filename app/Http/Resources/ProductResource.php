<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'product_category_id' => $this->product_category_id,
            'product_unit_id' => $this->product_unit_id,
            'warehouse_id' => $this->warehouse_id,
            'name' => $this->name,
            'code' => $this->code,
            'barcode' => $this->barcode,
            'sku' => $this->sku,
            'description' => $this->description,
            'purchase_price' => $this->purchase_price,
            'sales_price' => $this->sales_price,
            'opening_stock' => $this->opening_stock,
            'reorder_level' => $this->reorder_level,
            'active' => $this->active,
            'user_add_id' => $this->user_add_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
