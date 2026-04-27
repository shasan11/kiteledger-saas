<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ChartOfAccountsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('App/Accounting/ChartOfAccounts/Index');
    }
}
