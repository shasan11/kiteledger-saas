<?php

namespace App\Http\Controllers\Api;

use App\Models\SalesOrder;
use App\Models\SalesOrderLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class SalesOrderController extends BaseCrudApiController
{
    protected string $modelClass = SalesOrder::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch','contact','warehouse','currency'];
    protected array $relationDetails = ['branch'=>'branch_id','contact'=>'contact_id','warehouse'=>'warehouse_id','currency'=>'currency_id'];
    protected array $searchable = ['sales_order_no','reference','notes','status'];
    protected array $filterable = ['branch_id','contact_id','warehouse_id','currency_id','status'];
    protected array $booleanFilters = ['active','approved','void'];
    protected array $dateRangeFilters = ['sales_order_date'=>['from'=>'date_from','to'=>'date_to']];
    protected array $sortable = ['id','sales_order_no','sales_order_date','status','subtotal','grand_total','created_at'];
    protected string $defaultSort = '-created_at';
    protected array $nested = ['items'=>['relation'=>'salesOrderLines','model'=>SalesOrderLine::class,'foreign_key'=>'sales_order_id','delete_key'=>'deleted_item_ids','required'=>true,'min'=>1,'replace_on_update'=>false,'relations'=>['productVariant','taxRate'],'relation_details'=>['productVariant'=>'product_variant_id','taxRate'=>'tax_rate_id'],'rules'=>['product_variant_id'=>['nullable','uuid','exists:product_variants,id'],'custom_product_name'=>['nullable','string','max:180'],'description'=>['nullable','string','max:200'],'qty'=>['required','numeric','min:0'],'unit_price'=>['required','numeric','min:0'],'discount_percent'=>['nullable','numeric','min:0'],'tax_rate_id'=>['nullable','uuid','exists:tax_rates,id'],'tax_amount'=>['nullable','numeric','min:0'],'line_total'=>['nullable','numeric','min:0']],'update_rules'=>['product_variant_id'=>['nullable','uuid','exists:product_variants,id'],'custom_product_name'=>['nullable','string','max:180'],'description'=>['nullable','string','max:200'],'qty'=>['required','numeric','min:0'],'unit_price'=>['required','numeric','min:0'],'discount_percent'=>['nullable','numeric','min:0'],'tax_rate_id'=>['nullable','uuid','exists:tax_rates,id'],'tax_amount'=>['nullable','numeric','min:0'],'line_total'=>['nullable','numeric','min:0']]]];
    protected array $storeRules = ['branch_id'=>['nullable','uuid','exists:branches,id'],'sales_order_no'=>['required','string','max:40','unique:sales_orders,sales_order_no'],'sales_order_date'=>['required','date'],'contact_id'=>['required','uuid','exists:contacts,id'],'warehouse_id'=>['nullable','uuid','exists:warehouses,id'],'currency_id'=>['nullable','uuid','exists:currencies,id'],'reference'=>['nullable','string','max:120'],'notes'=>['nullable','string'],'subtotal'=>['nullable','numeric','min:0'],'discount_total'=>['nullable','numeric','min:0'],'tax_total'=>['nullable','numeric','min:0'],'grand_total'=>['nullable','numeric','min:0'],'status'=>['nullable','in:draft,confirmed,fulfilled,cancelled']];
    protected function updateRules(Request $request, Model $record): array { return ['branch_id'=>['sometimes','nullable','uuid','exists:branches,id'],'sales_order_no'=>['sometimes','required','string','max:40','unique:sales_orders,sales_order_no,'.$record->id.',id'],'sales_order_date'=>['sometimes','required','date'],'contact_id'=>['sometimes','required','uuid','exists:contacts,id'],'warehouse_id'=>['sometimes','nullable','uuid','exists:warehouses,id'],'currency_id'=>['sometimes','nullable','uuid','exists:currencies,id'],'reference'=>['sometimes','nullable','string','max:120'],'notes'=>['sometimes','nullable','string'],'subtotal'=>['sometimes','nullable','numeric','min:0'],'discount_total'=>['sometimes','nullable','numeric','min:0'],'tax_total'=>['sometimes','nullable','numeric','min:0'],'grand_total'=>['sometimes','nullable','numeric','min:0'],'status'=>['sometimes','nullable','in:draft,confirmed,fulfilled,cancelled']]; }
    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model { $subtotal=0; $discountTotal=0; $taxTotal=0; $grand=0; foreach($record->salesOrderLines as $line){$base=(float)$line->qty*(float)$line->unit_price; $disc=$base*((float)($line->discount_percent??0)/100); $tax=(float)($line->tax_amount??0); $lt=$base-$disc+$tax; $line->forceFill(['line_total'=>$lt])->save(); $subtotal+=$base; $discountTotal+=$disc; $taxTotal+=$tax; $grand+=$lt;} $record->forceFill(['subtotal'=>$subtotal,'discount_total'=>$discountTotal,'tax_total'=>$taxTotal,'grand_total'=>$grand,'total'=>$grand])->save(); return $record; }
}
