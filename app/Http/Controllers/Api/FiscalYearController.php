<?php

namespace App\Http\Controllers\Api;

use App\Models\FiscalYear;
use App\Models\JournalVoucher;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

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
        'status' => ['nullable', 'in:DRAFT,ACTIVE'],
        'lock_date' => ['nullable', 'date'],
        'is_current' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        $rules = $this->makeRulesPartial($this->storeRules);
        $rules['code'] = ['sometimes', 'nullable', 'string', 'max:40', 'unique:fiscal_years,code,'.$record->id.',id'];

        return $rules;
    }

    protected function checkAccess(Request $request, string $action, mixed $record = null): void
    {
        $user = $request->user();

        abort_unless(
            $user && ($this->userHasAdministrativeBypass($user) || $user->can('settings.fiscal-years.manage')),
            403,
            'Missing permission: settings.fiscal-years.manage'
        );
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $overlaps = FiscalYear::query()
            ->whereKeyNot($record->id)
            ->whereDate('start_date', '<=', $record->end_date)
            ->whereDate('end_date', '>=', $record->start_date)
            ->exists();
        if ($overlaps) {
            throw ValidationException::withMessages(['start_date' => 'Fiscal-year date ranges cannot overlap.']);
        }
        if ($record->lock_date && ($record->lock_date->lt($record->start_date) || $record->lock_date->gt($record->end_date))) {
            throw ValidationException::withMessages(['lock_date' => 'The lock date must fall inside the fiscal year.']);
        }

        if ($record->is_current || $record->status === 'ACTIVE') {
            DB::table('fiscal_years')
                ->where('id', '!=', $record->id)
                ->update(['is_current' => false, 'status' => DB::raw("CASE WHEN status = 'ACTIVE' THEN 'DRAFT' ELSE status END")]);
            $record->forceFill(['is_current' => true, 'status' => 'ACTIVE', 'active' => true])->saveQuietly();
        }

        return $record;
    }

    public function update(Request $request, mixed $id)
    {
        $record = FiscalYear::query()->findOrFail($id);
        $this->checkAccess($request, 'update', $record);
        abort_if($record->status === 'CLOSED', 409, 'Use the controlled reopen action before editing a closed fiscal year.');

        return parent::update($request, $id);
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = FiscalYear::query()->findOrFail($id);
        $this->checkAccess($request, 'destroy', $record);
        abort_if($record->status === 'CLOSED' || $record->is_current, 409, 'Closed or current fiscal years cannot be deleted.');
        abort_if(JournalVoucher::where('fiscal_year_id', $record->id)->exists(), 409, 'A fiscal year with journal activity cannot be deleted.');

        return parent::destroy($request, $id);
    }

    public function markCurrent(Request $request, string $id)
    {
        $record = FiscalYear::query()->findOrFail($id);
        $this->checkAccess($request, 'update', $record);

        if ($record->status === 'CLOSED') {
            throw ValidationException::withMessages(['fiscal_year' => 'Reopen the fiscal year before marking it current.']);
        }

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
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'confirmation' => ['required', 'string'],
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $this->validatePasswordAndPhrase($request, $data, 'CLOSE '.$this->confirmationLabel($record));

        $closed = DB::transaction(function () use ($record, $request, $data) {
            $year = FiscalYear::query()->lockForUpdate()->findOrFail($record->id);
            abort_if($year->status === 'CLOSED', 409, 'This fiscal year is already closed.');

            $this->assertCloseReady($year);

            $before = $year->only(['status', 'is_current', 'lock_date']);
            $year->update([
                'status' => 'CLOSED',
                'is_current' => false,
                'lock_date' => $year->end_date->toDateString(),
            ]);
            $this->writeActivity($request, 'closed', $year, $data['reason'], $before);

            return $year->fresh();
        });

        return response()->json($this->serializeRecord($closed));
    }

    public function reopen(Request $request, string $id)
    {
        $record = FiscalYear::query()->findOrFail($id);
        $this->checkAccess($request, 'update', $record);
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'confirmation' => ['required', 'string'],
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $this->validatePasswordAndPhrase($request, $data, 'REOPEN '.$this->confirmationLabel($record));

        $reopened = DB::transaction(function () use ($record, $request, $data) {
            $year = FiscalYear::query()->lockForUpdate()->findOrFail($record->id);
            abort_unless($year->status === 'CLOSED', 409, 'Only a closed fiscal year can be reopened.');

            $before = $year->only(['status', 'is_current', 'lock_date']);
            $year->update(['status' => 'DRAFT', 'is_current' => false, 'lock_date' => null]);
            $this->writeActivity($request, 'reopened', $year, $data['reason'], $before);

            return $year->fresh();
        });

        return response()->json($this->serializeRecord($reopened));
    }

    private function assertCloseReady(FiscalYear $year): void
    {
        $voucherQuery = JournalVoucher::query()->where(function ($query) use ($year) {
            $query->where('fiscal_year_id', $year->id)
                ->orWhere(function ($dates) use ($year) {
                    $dates->whereNull('fiscal_year_id')
                        ->whereBetween('voucher_date', [$year->start_date->toDateString(), $year->end_date->toDateString()]);
                });
        });

        $unpostedVouchers = (clone $voucherQuery)
            ->whereNotIn('status', ['posted', 'cancelled'])
            ->count();

        if ($unpostedVouchers > 0) {
            throw ValidationException::withMessages([
                'close_checklist' => "Post or cancel {$unpostedVouchers} draft journal voucher(s) before closing this fiscal year.",
            ]);
        }

        $unbalanced = (clone $voucherQuery)
            ->where('status', 'posted')
            ->withSum('lines as debit_total', 'debit')
            ->withSum('lines as credit_total', 'credit')
            ->get()
            ->first(fn (JournalVoucher $voucher) => round((float) $voucher->debit_total, 2) !== round((float) $voucher->credit_total, 2));

        if ($unbalanced) {
            throw ValidationException::withMessages([
                'close_checklist' => 'A posted journal voucher is out of balance. Correct the ledger before closing.',
            ]);
        }

        $draftDocuments = $this->countUnapprovedDocuments($year);
        if ($draftDocuments > 0) {
            throw ValidationException::withMessages([
                'close_checklist' => "Approve, post, void, or remove {$draftDocuments} draft financial document(s) before closing this fiscal year.",
            ]);
        }
    }

    private function countUnapprovedDocuments(FiscalYear $year): int
    {
        $documents = [
            ['invoices', 'invoice_date'],
            ['purchase_bills', 'bill_date'],
            ['debit_notes', 'debit_note_date'],
            ['expenses', 'expense_date'],
            ['customer_payments', 'payment_date'],
            ['supplier_payments', 'payment_date'],
            ['sales_returns', 'sales_return_date'],
        ];

        return collect($documents)->sum(function (array $document) use ($year): int {
            [$table, $dateColumn] = $document;
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $dateColumn) || ! Schema::hasColumn($table, 'approved')) {
                return 0;
            }

            $query = DB::table($table)
                ->whereBetween($dateColumn, [$year->start_date->toDateString(), $year->end_date->toDateString()])
                ->where('approved', false);

            if (Schema::hasColumn($table, 'void')) {
                $query->where('void', false);
            }
            if (Schema::hasColumn($table, 'active')) {
                $query->where('active', true);
            }

            return $query->count();
        });
    }

    private function validatePasswordAndPhrase(Request $request, array $data, string $expected): void
    {
        if (! Hash::check($data['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages(['current_password' => 'The password is incorrect.']);
        }

        if (! hash_equals($expected, trim($data['confirmation']))) {
            throw ValidationException::withMessages(['confirmation' => "Type {$expected} exactly to continue."]);
        }
    }

    private function confirmationLabel(FiscalYear $year): string
    {
        return (string) ($year->code ?: $year->name);
    }

    private function writeActivity(Request $request, string $action, FiscalYear $year, string $reason, array $before): void
    {
        if (! Schema::hasTable('activity_logs')) {
            return;
        }

        DB::table('activity_logs')->insert([
            'user_id' => $request->user()?->id,
            'module' => 'fiscal_years',
            'action' => $action,
            'description' => json_encode([
                'fiscal_year_id' => $year->id,
                'reason' => $reason,
                'before' => $before,
                'after' => $year->only(['status', 'is_current', 'lock_date']),
            ], JSON_THROW_ON_ERROR),
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 1000),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
