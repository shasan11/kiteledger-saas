<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #1f2937; font-size: 12px; }
        h1, h2, h3 { margin: 0; }
        .header { display: table; width: 100%; margin-bottom: 22px; border-bottom: 2px solid #e5e7eb; padding-bottom: 14px; }
        .header > div { display: table-cell; vertical-align: top; }
        .right { text-align: right; }
        .muted { color: #6b7280; }
        .tag { display: inline-block; padding: 4px 8px; border-radius: 10px; background: #eef2ff; color: #3730a3; font-size: 11px; }
        .grid { display: table; width: 100%; margin-bottom: 16px; }
        .grid > div { display: table-cell; width: 50%; vertical-align: top; padding-right: 12px; }
        .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f3f4f6; text-align: left; font-weight: 700; }
        th, td { border: 1px solid #e5e7eb; padding: 7px; }
        .amount { text-align: right; }
        .summary { width: 45%; margin-left: auto; }
        .summary td { border: 0; padding: 5px; }
        .total { font-size: 16px; font-weight: 700; color: #111827; }
    </style>
</head>
<body>
    @php
        $tr = fn (string $key) => app(\App\Services\LocalizationService::class)
            ->translationsFor(app()->getLocale())[$key] ?? $key;
        $employee = $payslip->employee ?: $payslip->user;
        $period = $payslip->payroll?->payrollPeriod;
        $earnings = $payslip->lines->where('type', 'earning');
        $deductions = $payslip->lines->where('type', 'deduction');
        $contributions = $payslip->lines->where('type', 'employer_contribution');
        $money = fn ($value) => number_format((float) $value, 2);
    @endphp

    <div class="header">
        <div>
            <h2>{{ config('app.name', 'KiteLedger') }}</h2>
            <div class="muted">{{ $payslip->branch?->name ?: $tr('Payroll Department') }}</div>
        </div>
        <div class="right">
            <h1>{{ $tr('Payslip') }}</h1>
            <div class="tag">{{ ucfirst($payslip->status ?: 'draft') }}</div>
        </div>
    </div>

    <div class="grid">
        <div class="box">
            <h3>{{ $tr('Employee') }}</h3>
            <p><strong>{{ $employee?->display_name ?: $employee?->name ?: '-' }}</strong></p>
            <p class="muted">{{ $employee?->employee_id ?: $employee?->email }}</p>
        </div>
        <div class="box">
            <h3>{{ $tr('Period') }}</h3>
            <p><strong>{{ $period?->name ?: (($payslip->salary_month ?: '-') . '/' . ($payslip->salary_year ?: '-')) }}</strong></p>
            <p class="muted">{{ $tr('Payslip') }}: {{ $payslip->payslip_number ?: '-' }}</p>
        </div>
    </div>

    <div class="box">
        <h3>{{ $tr('Attendance Summary') }}</h3>
        <table>
            <tr>
                <th>{{ $tr('Working Days') }}</th><th>{{ $tr('Payable Days') }}</th><th>{{ $tr('Paid Leave') }}</th><th>{{ $tr('Unpaid Leave') }}</th><th>{{ $tr('Overtime Hours') }}</th>
            </tr>
            <tr>
                <td>{{ $payslip->total_working_days }}</td>
                <td>{{ $payslip->payable_days }}</td>
                <td>{{ $payslip->paid_leave }}</td>
                <td>{{ $payslip->unpaid_leave_days ?: $payslip->unpaid_leave }}</td>
                <td>{{ $payslip->overtime_hours }}</td>
            </tr>
        </table>
    </div>

    <div class="grid">
        <div>
            <h3>{{ $tr('Earnings') }}</h3>
            <table>
                <tr><th>{{ $tr('Name') }}</th><th class="amount">{{ $tr('Amount') }}</th></tr>
                @forelse ($earnings as $line)
                    <tr><td>{{ $line->name }}</td><td class="amount">{{ $money($line->amount) }}</td></tr>
                @empty
                    <tr><td colspan="2">{{ $tr('No earnings') }}</td></tr>
                @endforelse
            </table>
        </div>
        <div>
            <h3>{{ $tr('Deductions') }}</h3>
            <table>
                <tr><th>{{ $tr('Name') }}</th><th class="amount">{{ $tr('Amount') }}</th></tr>
                @forelse ($deductions as $line)
                    <tr><td>{{ $line->name }}</td><td class="amount">{{ $money($line->amount) }}</td></tr>
                @empty
                    <tr><td colspan="2">{{ $tr('No deductions') }}</td></tr>
                @endforelse
            </table>
        </div>
    </div>

    @if($contributions->count())
        <div class="box">
            <h3>{{ $tr('Employer Contributions') }}</h3>
            <table>
                <tr><th>{{ $tr('Name') }}</th><th class="amount">{{ $tr('Amount') }}</th></tr>
                @foreach ($contributions as $line)
                    <tr><td>{{ $line->name }}</td><td class="amount">{{ $money($line->amount) }}</td></tr>
                @endforeach
            </table>
        </div>
    @endif

    <table class="summary">
        <tr><td>{{ $tr('Gross Earnings') }}</td><td class="amount">{{ $money($payslip->gross_earnings) }}</td></tr>
        <tr><td>{{ $tr('Total Deductions') }}</td><td class="amount">{{ $money($payslip->total_deductions) }}</td></tr>
        <tr><td class="total">{{ $tr('Net Payable') }}</td><td class="amount total">{{ $money($payslip->net_payable ?: $payslip->total_payable) }}</td></tr>
        <tr><td>{{ $tr('Payment Status') }}</td><td class="amount">{{ $payslip->payment_status ?: $tr('UNPAID') }}</td></tr>
    </table>
</body>
</html>
