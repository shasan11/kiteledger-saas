<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use Inertia\Inertia;
use Inertia\Response;

class AccountingController extends Controller
{
    public function chartOfAccounts(): Response
    {
        return Inertia::render('App/Accounting/ChartOfAccounts/Index', [
            'branches' => Branch::query()->orderBy('name')->get(['id', 'name']),
            'accounts' => Account::query()->orderBy('name')->get(['id', 'name', 'code']),
            'currencies' => Currency::query()->orderBy('code')->get(['id', 'name', 'code']),
        ]);
    }

    public function bankAccounts(): Response
    {
        return Inertia::render('App/Accounting/BankAccounts/Index', [
            'branches' => Branch::query()->orderBy('name')->get(['id', 'name']),
            'currencies' => Currency::query()->orderBy('code')->get(['id', 'name', 'code']),
            'accounts' => Account::query()->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function cashTransfers(): Response
    {
        return Inertia::render('App/Accounting/CashTransfers/Index', [
            'branches' => Branch::query()->orderBy('name')->get(['id', 'name']),
            'currencies' => Currency::query()->orderBy('code')->get(['id', 'name', 'code']),
            'bankAccounts' => BankAccount::query()->orderBy('display_name')->get(['id', 'display_name', 'code']),
        ]);
    }

    public function journalVouchers(): Response
    {
        return Inertia::render('App/Accounting/JournalVouchers/Index', [
            'branches' => Branch::query()->orderBy('name')->get(['id', 'name']),
            'currencies' => Currency::query()->orderBy('code')->get(['id', 'name', 'code']),
            'accounts' => ChartOfAccount::query()->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function quickBills(): Response
    {
        return Inertia::render('App/Accounting/QuickBills/Index');
    }

    public function quickReceipts(): Response
    {
        return Inertia::render('App/Accounting/QuickReceipts/Index');
    }

    public function fixedAssets(): Response
    {
        return Inertia::render('App/Accounting/FixedAssets/Index');
    }

    public function loanAccounts(): Response
    {
        return Inertia::render('App/Accounting/LoanAccounts/Index');
    }
}
