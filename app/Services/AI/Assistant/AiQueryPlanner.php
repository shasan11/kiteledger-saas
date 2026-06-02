<?php

namespace App\Services\AI\Assistant;

use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Services\AppContextService;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;

class AiQueryPlanner
{
    public function __construct(
        private readonly AiToolRegistry $registry,
        private readonly BranchScopeService $branchScope,
        private readonly AppContextService $appContext,
    ) {}

    public function plan(Request $request, array $classification): array
    {
        $intent = $classification['intent'] ?? 'unsupported';
        $tool = $this->registry->forIntent($intent);
        if (! $tool) {
            return ['ok' => false, 'clarification' => 'I can help with finance, accounting, sales, purchase, receivable, payable, cash/bank, tax, inventory, and document questions.'];
        }

        $filters = $classification['filters'] ?? [];
        $dateRange = $filters['date_range'] ?? [];
        $fiscalYear = null;

        try {
            $fiscalYear = $this->appContext->resolveFiscalYearForRequest($request);
        } catch (\Throwable) {
            $fiscalYear = null;
        }

        if (empty($dateRange['from']) && $fiscalYear) {
            $dateRange['from'] = $fiscalYear->start_date?->toDateString();
            $dateRange['to'] = $fiscalYear->end_date?->toDateString();
            $dateRange['label'] = $dateRange['label'] ?? 'current fiscal year';
        }

        $filters['date_range'] = $dateRange;
        $filters['branch_id'] = $this->branchScope->selectedBranchId($request, $request->user());
        $filters['fiscal_year_id'] = $fiscalYear?->id;

        if ($intent === 'ledger_query') {
            $resolved = $this->resolveLedgerEntity((string) ($filters['entity_name'] ?? ''));
            if (($resolved['status'] ?? null) !== 'resolved') {
                return [
                    'ok' => false,
                    'clarification' => $resolved['message'] ?? 'Which customer, supplier, or account do you want to view?',
                    'matches' => $resolved['matches'] ?? [],
                ];
            }
            $filters = array_merge($filters, $resolved);
        }

        return [
            'ok' => true,
            'intent' => $intent,
            'tool' => $tool,
            'filters' => $filters,
            'limit' => $tool['max_rows'],
        ];
    }

    private function resolveLedgerEntity(string $name): array
    {
        $name = trim($name);
        if ($name === '') {
            return ['status' => 'missing', 'message' => 'Which customer, supplier, or account do you want to view?'];
        }

        $contacts = Contact::query()
            ->where('active', true)
            ->where(fn ($query) => $query->where('name', 'like', "%{$name}%")->orWhere('code', 'like', "%{$name}%"))
            ->limit(3)
            ->get(['id', 'name', 'code', 'account_id', 'payable_account_id']);

        $accounts = ChartOfAccount::query()
            ->where('active', true)
            ->where(fn ($query) => $query->where('name', 'like', "%{$name}%")->orWhere('code', 'like', "%{$name}%"))
            ->limit(3)
            ->get(['id', 'account_id', 'name', 'code']);

        if ($contacts->count() + $accounts->count() === 1) {
            if ($contacts->count() === 1) {
                $contact = $contacts->first();
                return [
                    'status' => 'resolved',
                    'entity_type' => 'contact',
                    'contact_id' => $contact->id,
                    'account_id' => $contact->account_id ?: $contact->payable_account_id,
                    'entity_label' => $contact->name,
                ];
            }

            $account = $accounts->first();
            return [
                'status' => 'resolved',
                'entity_type' => 'account',
                'chart_of_account_id' => $account->id,
                'account_id' => $account->account_id,
                'entity_label' => $account->name,
            ];
        }

        if ($contacts->isEmpty() && $accounts->isEmpty()) {
            return ['status' => 'not_found', 'message' => 'No matching customer, supplier, or account was found.'];
        }

        return [
            'status' => 'multiple',
            'message' => 'I found multiple matches. Please choose the exact customer, supplier, or account.',
            'matches' => $contacts->map(fn ($row) => ['type' => 'Contact', 'name' => $row->name, 'code' => $row->code])
                ->merge($accounts->map(fn ($row) => ['type' => 'Account', 'name' => $row->name, 'code' => $row->code]))
                ->values()
                ->all(),
        ];
    }
}
