<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class AccountingController extends Controller
{
    public function bankAccounts(): Response
    {
        return Inertia::render('App/Accounting/BankAccounts/Index');
    }

    public function cashTransfers(): Response
    {
        return Inertia::render('App/Accounting/CashTransfers/Index');
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
