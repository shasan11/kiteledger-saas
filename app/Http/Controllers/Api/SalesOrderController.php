<?php

namespace App\Http\Controllers\Api;

use App\Models\SalesOrder;
use App\Models\SalesOrderLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SalesOrderController extends BaseCrudApiController
{
    protected string $modelClass = SalesOrder::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'contact',
        'warehouse',
        'currency',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'contact' => 'contact_id',
        'warehouse' => 'warehouse_id',
        'currency' => 'currency_id',
    ];

    protected array $searchable = [
        'sales_order_no',
        'reference',
        'notes',
        'status',
        'contact.name',
        'contact.phone',
        'contact.email',
        'warehouse.name',
        'currency.code',
    ];

    protected array $filterable = [
        'branch_id',
        'contact_id',
        'warehouse_id',
        'currency_id',
        'status',
    ];

    protected array $booleanFilters = [
        'active',
        'approved',
        'void',
    ];

    protected array $dateRangeFilters = [
        'sales_order_date' => [
            'from' => 'date_from',
            'to' => 'date_to',
        ],
    ];

    protected array $sortable = [
        'id',
        'sales_order_no',
        'sales_order_date',
        'status',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'salesOrderLines',
            'model' => SalesOrderLine::class,
            'foreign_key' => 'sales_order_id',
            'delete_key' => 'deleted_item_ids',

            'required' => true,
            'min' => 1,
            'replace_on_update' => false,

            'relations' => [
                'product',
                'taxRate',
            ],

            'relation_details' => [
                'product' => 'product_id',
                'taxRate' => 'tax_rate_id',
            ],

            'rules' => [
                'product_id' => [
                    'nullable',
                    'uuid',
                    'exists:products,id',
                    'required_without:custom_product_name',
                ],
                'custom_product_name' => [
                    'nullable',
                    'string',
                    'max:180',
                    'required_without:product_id',
                ],
                'description' => [
                    'nullable',
                    'string',
                    'max:200',
                ],
                'qty' => [
                    'required',
                    'numeric',
                    'gt:0',
                ],
                'unit_price' => [
                    'required',
                    'numeric',
                    'min:0',
                ],
                'discount_percent' => [
                    'nullable',
                    'numeric',
                    'min:0',
                    'max:100',
                ],
                'tax_rate_id' => [
                    'nullable',
                    'uuid',
                    'exists:tax_rates,id',
                ],
                'tax_amount' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
                'line_total' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
            ],

            'update_rules' => [
                'product_id' => [
                    'nullable',
                    'uuid',
                    'exists:products,id',
                    'required_without:custom_product_name',
                ],
                'custom_product_name' => [
                    'nullable',
                    'string',
                    'max:180',
                    'required_without:product_id',
                ],
                'description' => [
                    'nullable',
                    'string',
                    'max:200',
                ],
                'qty' => [
                    'required',
                    'numeric',
                    'gt:0',
                ],
                'unit_price' => [
                    'required',
                    'numeric',
                    'min:0',
                ],
                'discount_percent' => [
                    'nullable',
                    'numeric',
                    'min:0',
                    'max:100',
                ],
                'tax_rate_id' => [
                    'nullable',
                    'uuid',
                    'exists:tax_rates,id',
                ],
                'tax_amount' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
                'line_total' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => [
            'nullable',
            'uuid',
            'exists:branches,id',
        ],
        'sales_order_no' => [
            'nullable',
            'string',
            'max:40',
            'unique:sales_orders,sales_order_no',
        ],
        'sales_order_date' => [
            'required',
            'date',
        ],
        'contact_id' => [
            'required',
            'uuid',
            'exists:contacts,id',
        ],
        'warehouse_id' => [
            'nullable',
            'uuid',
            'exists:warehouses,id',
        ],
        'currency_id' => [
            'nullable',
            'uuid',
            'exists:currencies,id',
        ],
        'reference' => [
            'nullable',
            'string',
            'max:120',
        ],
        'notes' => [
            'nullable',
            'string',
        ],
        'exchange_rate' => [
            'nullable',
            'numeric',
            'gt:0',
        ],
        'subtotal' => [
            'nullable',
            'numeric',
            'min:0',
        ],
        'discount_total' => [
            'nullable',
            'numeric',
            'min:0',
        ],
        'tax_total' => [
            'nullable',
            'numeric',
            'min:0',
        ],
        'grand_total' => [
            'nullable',
            'numeric',
            'min:0',
        ],
        'status' => [
            'nullable',
            'in:draft,confirmed,fulfilled,cancelled',
        ],
        'active' => [
            'nullable',
            'boolean',
        ],
        'approved' => [
            'nullable',
            'boolean',
        ],
        'void' => [
            'nullable',
            'boolean',
        ],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:branches,id',
            ],
            'sales_order_no' => [
                'sometimes',
                'nullable',
                'string',
                'max:40',
                Rule::unique('sales_orders', 'sales_order_no')->ignore($record->getKey()),
            ],
            'sales_order_date' => [
                'sometimes',
                'required',
                'date',
            ],
            'contact_id' => [
                'sometimes',
                'required',
                'uuid',
                'exists:contacts,id',
            ],
            'warehouse_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:warehouses,id',
            ],
            'currency_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:currencies,id',
            ],
            'reference' => [
                'sometimes',
                'nullable',
                'string',
                'max:120',
            ],
            'notes' => [
                'sometimes',
                'nullable',
                'string',
            ],
            'exchange_rate' => [
                'sometimes',
                'nullable',
                'numeric',
                'gt:0',
            ],
            'subtotal' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],
            'discount_total' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],
            'tax_total' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],
            'grand_total' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],
            'status' => [
                'sometimes',
                'nullable',
                'in:draft,confirmed,fulfilled,cancelled',
            ],
            'active' => [
                'sometimes',
                'nullable',
                'boolean',
            ],
            'approved' => [
                'sometimes',
                'nullable',
                'boolean',
            ],
            'void' => [
                'sometimes',
                'nullable',
                'boolean',
            ],
        ];
    }

    protected function afterSave(
        Model $record,
        array $parentData,
        array $nestedData,
        bool $isUpdate
    ): Model {
        $lines = $record->salesOrderLines()
            ->with('taxRate')
            ->get();

        if ($lines->count() < 1) {
            $this->throwValidation([
                'items' => ['At least one sales order item is required.'],
            ]);
        }

        $subtotal = 0;
        $discountTotal = 0;
        $taxTotal = 0;
        $grandTotal = 0;

        foreach ($lines as $line) {
            $qty = (float) $line->qty;
            $unitPrice = (float) $line->unit_price;
            $discountPercent = (float) ($line->discount_percent ?? 0);

            $baseAmount = $qty * $unitPrice;
            $discountAmount = $baseAmount * ($discountPercent / 100);
            $taxableAmount = max($baseAmount - $discountAmount, 0);

            $taxAmount = $this->calculateTaxAmount($line, $taxableAmount);
            $lineTotal = $taxableAmount + $taxAmount;

            $line->forceFill([
                'tax_amount' => round($taxAmount, 2),
                'line_total' => round($lineTotal, 2),
            ])->save();

            $subtotal += $baseAmount;
            $discountTotal += $discountAmount;
            $taxTotal += $taxAmount;
            $grandTotal += $lineTotal;
        }

        $record->forceFill([
            'subtotal' => round($subtotal, 2),
            'discount_total' => round($discountTotal, 2),
            'tax_total' => round($taxTotal, 2),
            'grand_total' => round($grandTotal, 2),
            'total' => round($grandTotal, 2),
        ])->save();

        return $record;
    }

    protected function calculateTaxAmount(SalesOrderLine $line, float $taxableAmount): float
    {
        $taxRate = $line->taxRate;

        if (!$taxRate) {
            return (float) ($line->tax_amount ?? 0);
        }

        $ratePercent = (float) ($taxRate->rate_percent ?? 0);

        if ($ratePercent <= 0) {
            return 0;
        }

        return $taxableAmount * ($ratePercent / 100);
    }
}
