<?php

namespace App\Http\Controllers\Api;

use App\Domain\Accounting\Services\JournalVoucherService;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\FiscalYear;
use App\Models\FixedAsset;
use App\Models\FixedAssetDepreciation;
use App\Models\JournalVoucher;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FixedAssetController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAction($request, 'view');
        $query = FixedAsset::with(['depreciations' => fn ($items) => $items->latest('depreciation_date')]);
        $branches = app(BranchScopeService::class);
        if ($branches->isBranchLimited($request->user())) {
            $query->whereIn('branch_id', $branches->accessibleBranchIds($request->user()));
        }
        if ($request->filled('search')) {
            $query->where(fn ($builder) => $builder->where('asset_code', 'like', '%'.$request->string('search').'%')->orWhere('name', 'like', '%'.$request->string('search').'%'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->latest()->paginate(25));
    }

    public function store(Request $request)
    {
        $this->authorizeAction($request, 'create');
        $data = $request->validate($this->rules());
        $data = $this->scopeBranch($request, $data);
        $this->assertSameCurrency([$data['asset_account_id'], $data['accumulated_depreciation_account_id'], $data['depreciation_expense_account_id']]);
        $data['book_value'] = round((float) $data['cost'], 2);

        return response()->json(FixedAsset::create($data), 201);
    }

    public function update(Request $request, FixedAsset $fixedAsset)
    {
        $this->authorizeAction($request, 'update', $fixedAsset);
        abort_if($fixedAsset->status === 'disposed', 422, 'Disposed assets cannot be edited.');
        $data = $request->validate($this->rules($fixedAsset));
        $data = $this->scopeBranch($request, $data);
        $this->assertSameCurrency([$data['asset_account_id'], $data['accumulated_depreciation_account_id'], $data['depreciation_expense_account_id']]);
        if ($fixedAsset->depreciations()->exists()) {
            $changed = round((float) $fixedAsset->cost, 2) !== round((float) $data['cost'], 2)
                || round((float) $fixedAsset->salvage_value, 2) !== round((float) $data['salvage_value'], 2)
                || (int) $fixedAsset->useful_life_months !== (int) $data['useful_life_months']
                || $fixedAsset->in_service_date->toDateString() !== Carbon::parse($data['in_service_date'])->toDateString()
                || collect(['asset_account_id', 'accumulated_depreciation_account_id', 'depreciation_expense_account_id'])
                    ->contains(fn ($field) => (string) $fixedAsset->{$field} !== (string) $data[$field]);
            abort_if($changed, 422, 'Financial values and accounts cannot be changed after depreciation has been posted.');
        }
        $data['book_value'] = max((float) $data['salvage_value'], round((float) $data['cost'] - (float) $fixedAsset->accumulated_depreciation, 2));
        $fixedAsset->update($data);

        return response()->json($fixedAsset->fresh('depreciations'));
    }

    public function destroy(Request $request, FixedAsset $fixedAsset)
    {
        $this->authorizeAction($request, 'delete', $fixedAsset);
        abort_if($fixedAsset->depreciations()->exists() || $fixedAsset->status === 'disposed', 422, 'Assets with posted accounting activity cannot be deleted.');
        $fixedAsset->delete();

        return response()->noContent();
    }

    public function depreciate(Request $request, FixedAsset $fixedAsset, JournalVoucherService $journals)
    {
        $this->authorizeAction($request, 'update', $fixedAsset);
        $data = $request->validate(['depreciation_date' => ['required', 'date'], 'amount' => ['nullable', 'numeric', 'gt:0']]);

        return DB::transaction(function () use ($data, $fixedAsset, $request, $journals) {
            $asset = FixedAsset::lockForUpdate()->findOrFail($fixedAsset->id);
            abort_unless($asset->status === 'active', 422, 'Only active assets can be depreciated.');
            abort_if($asset->in_service_date->gt($data['depreciation_date']), 422, 'Depreciation cannot precede the in-service date.');
            $remaining = max(0, round((float) $asset->cost - (float) $asset->salvage_value - (float) $asset->accumulated_depreciation, 2));
            $monthly = round(((float) $asset->cost - (float) $asset->salvage_value) / max(1, (int) $asset->useful_life_months), 2);
            abort_if(isset($data['amount']) && round((float) $data['amount'], 2) > $remaining, 422, 'The depreciation amount exceeds the remaining depreciable value.');
            $amount = min($remaining, round((float) ($data['amount'] ?? $monthly), 2));
            abort_if($amount <= 0, 422, 'This asset is already fully depreciated.');
            $date = Carbon::parse($data['depreciation_date'])->toDateString();
            $period = Carbon::parse($date)->format('Y-m');
            abort_if(
                FixedAssetDepreciation::where('fixed_asset_id', $asset->id)
                    ->where('depreciation_period', $period)
                    ->exists(),
                422,
                'Depreciation has already been posted for this month.'
            );
            $voucher = $this->journal($asset, $date, 'FixedAssetDepreciation', [
                [$asset->depreciation_expense_account_id, $amount, 0, 'Depreciation expense · '.$asset->name],
                [$asset->accumulated_depreciation_account_id, 0, $amount, 'Accumulated depreciation · '.$asset->name],
            ], $request->user()?->id, $journals);
            FixedAssetDepreciation::create(['fixed_asset_id' => $asset->id, 'depreciation_date' => $date, 'depreciation_period' => $period, 'amount' => $amount, 'journal_voucher_id' => $voucher->id]);
            $accumulated = round((float) $asset->accumulated_depreciation + $amount, 2);
            $asset->update(['accumulated_depreciation' => $accumulated, 'book_value' => max((float) $asset->salvage_value, round((float) $asset->cost - $accumulated, 2))]);

            return response()->json($asset->fresh('depreciations'));
        });
    }

    public function dispose(Request $request, FixedAsset $fixedAsset, JournalVoucherService $journals)
    {
        $this->authorizeAction($request, 'update', $fixedAsset);
        $data = $request->validate(['disposed_at' => ['required', 'date', 'after_or_equal:'.$fixedAsset->in_service_date->toDateString()], 'proceeds' => ['required', 'numeric', 'min:0'], 'proceeds_account_id' => ['required', 'uuid', 'exists:accounts,id'], 'gain_loss_account_id' => ['required', 'uuid', 'exists:accounts,id']]);
        $this->assertSameCurrency([$fixedAsset->asset_account_id, $data['proceeds_account_id'], $data['gain_loss_account_id']]);

        return DB::transaction(function () use ($data, $fixedAsset, $request, $journals) {
            $asset = FixedAsset::lockForUpdate()->findOrFail($fixedAsset->id);
            abort_unless($asset->status === 'active', 422, 'Only active assets can be disposed.');
            $proceeds = round((float) $data['proceeds'], 2);
            $bookValue = round((float) $asset->book_value, 2);
            $difference = round($proceeds - $bookValue, 2);
            $lines = [[$asset->accumulated_depreciation_account_id, (float) $asset->accumulated_depreciation, 0, 'Remove accumulated depreciation · '.$asset->name], [$data['proceeds_account_id'], $proceeds, 0, 'Asset disposal proceeds · '.$asset->name], [$asset->asset_account_id, 0, (float) $asset->cost, 'Remove asset cost · '.$asset->name]];
            if ($difference > 0) {
                $lines[] = [$data['gain_loss_account_id'], 0, $difference, 'Gain on disposal · '.$asset->name];
            }
            if ($difference < 0) {
                $lines[] = [$data['gain_loss_account_id'], abs($difference), 0, 'Loss on disposal · '.$asset->name];
            }
            $this->journal($asset, $data['disposed_at'], 'FixedAssetDisposal', $lines, $request->user()?->id, $journals);
            $asset->update(['status' => 'disposed', 'disposed_at' => $data['disposed_at'], 'disposal_proceeds' => $proceeds, 'book_value' => 0]);

            return response()->json($asset->fresh('depreciations'));
        });
    }

    private function journal(FixedAsset $asset, string $date, string $sourceType, array $lines, ?int $userId, JournalVoucherService $journals): JournalVoucher
    {
        $fiscalYear = FiscalYear::whereDate('start_date', '<=', $date)->whereDate('end_date', '>=', $date)->where('status', '!=', 'CLOSED')->first();
        if (! $fiscalYear) {
            throw ValidationException::withMessages(['depreciation_date' => 'No open fiscal year contains this accounting date.']);
        }
        $currencyId = Account::findOrFail($asset->asset_account_id)->currency_id;
        $voucher = JournalVoucher::create(['branch_id' => $asset->branch_id, 'fiscal_year_id' => $fiscalYear->id, 'voucher_date' => $date, 'currency_id' => $currencyId, 'reference' => $asset->asset_code, 'narration' => $sourceType.' for '.$asset->name, 'source_type' => $sourceType, 'source_id' => $asset->id, 'source_no' => $asset->asset_code, 'source_module' => 'fixed_assets', 'is_auto_generated' => true, 'is_system_generated' => true, 'status' => 'draft', 'active' => true, 'user_add_id' => $userId]);
        foreach ($lines as [$accountId, $debit, $credit, $description]) {
            if (round($debit, 2) <= 0 && round($credit, 2) <= 0) {
                continue;
            }
            $voucher->lines()->create(['account_id' => $accountId, 'description' => $description, 'debit' => $debit, 'credit' => $credit, 'currency_id' => $currencyId, 'exchange_rate' => 1]);
        }

        return $journals->post($voucher, $userId);
    }

    private function rules(?FixedAsset $asset = null): array
    {
        return ['asset_code' => ['required', 'string', 'max:40', Rule::unique('fixed_assets')->ignore($asset)], 'name' => ['required', 'string', 'max:255'], 'branch_id' => ['nullable', 'uuid', 'exists:branches,id'], 'purchase_date' => ['required', 'date'], 'in_service_date' => ['required', 'date', 'after_or_equal:purchase_date'], 'cost' => ['required', 'numeric', 'gt:0'], 'salvage_value' => ['required', 'numeric', 'min:0', 'lt:cost'], 'useful_life_months' => ['required', 'integer', 'min:1', 'max:1200'], 'depreciation_method' => ['required', Rule::in(['straight_line'])], 'asset_account_id' => ['required', 'uuid', 'exists:accounts,id'], 'accumulated_depreciation_account_id' => ['required', 'uuid', 'exists:accounts,id', 'different:asset_account_id'], 'depreciation_expense_account_id' => ['required', 'uuid', 'exists:accounts,id', 'different:asset_account_id', 'different:accumulated_depreciation_account_id'], 'notes' => ['nullable', 'string', 'max:5000']];
    }

    private function authorizeAction(Request $request, string $ability, ?FixedAsset $asset = null): void
    {
        abort_unless($request->user()?->can('accounting.fixed_asset.'.$ability), 403, 'You do not have permission to manage fixed assets.');
        if ($asset?->branch_id) {
            app(BranchScopeService::class)->assertCanAccessBranch($request->user(), $asset->branch_id);
        }
    }

    private function scopeBranch(Request $request, array $data): array
    {
        $branches = app(BranchScopeService::class);
        if ($branches->isBranchLimited($request->user())) {
            $data['branch_id'] ??= $branches->selectedBranchId($request, $request->user());
            abort_unless($data['branch_id'], 422, 'Select an accessible branch for this asset.');
        }
        if ($data['branch_id'] ?? null) {
            $branches->assertCanAccessBranch($request->user(), $data['branch_id']);
        }

        return $data;
    }

    private function assertSameCurrency(array $accountIds): void
    {
        $accounts = Account::whereIn('id', array_unique($accountIds))->where('active', true)->get(['id', 'currency_id']);
        abort_unless($accounts->count() === count(array_unique($accountIds)), 422, 'All selected accounts must be active.');
        abort_if($accounts->pluck('currency_id')->unique()->count() > 1, 422, 'All fixed-asset posting accounts must use the same currency.');
    }
}
