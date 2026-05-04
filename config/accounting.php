<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Loan Accounting Default Accounts
    |--------------------------------------------------------------------------
    |
    | These must be real account IDs from the accounts table.
    | Do not put ChartOfAccount IDs here.
    |
    */

    'loan_processing_fee_expense_account_id' => env('LOAN_PROCESSING_FEE_EXPENSE_ACCOUNT_ID'),

    'loan_charge_expense_account_id' => env('LOAN_CHARGE_EXPENSE_ACCOUNT_ID'),
];