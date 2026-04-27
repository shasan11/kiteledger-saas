<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class JournalVouchersController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('App/Accounting/JournalVouchers/Index');
    }

    public function lines(): Response
    {
        return Inertia::render('App/Accounting/JournalVoucherLines/Index');
    }
}
