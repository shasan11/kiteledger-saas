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
            <div class="muted">{{ $payslip->branch?->name ?: 'Payroll Department' }}</div>
        </div>
        <div class="right">
            <h1>Payslip</h1>
            <div class="tag">{{ ucfirst($payslip->status ?: 'draft') }}</div>
        </div>
    </div>

    <div class="grid">
        <div class="box">
            <h3>Employee</h3>
            <p><strong>{{ $employee?->display_name ?: $employee?->name ?: '-' }}</strong></p>
            <p class="muted">{{ $employee?->employee_id ?: $employee?->email }}</p>
        </div>
        <div class="box">
            <h3>Period</h3>
            <p><strong>{{ $period?->name ?: (($payslip->salary_month ?: '-') . '/' . ($payslip->salary_year ?: '-')) }}</strong></p>
            <p class="muted">Payslip: {{ $payslip->payslip_number ?: '-' }}</p>
        </div>
    </div>

    <div class="box">
        <h3>Attendance Summary</h3>
        <table>
            <tr>
                <th>Working Days</th><th>Payable Days</th><th>Paid Leave</th><th>Unpaid Leave</th><th>Overtime Hours</th>
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
            <h3>Earnings</h3>
            <table>
                <tr><th>Name</th><th class="amount">Amount</th></tr>
                @forelse ($earnings as $line)
                    <tr><td>{{ $line->name }}</td><td class="amount">{{ $money($line->amount) }}</td></tr>
                @empty
                    <tr><td colspan="2">No earnings</td></tr>
                @endforelse
            </table>
        </div>
        <div>
            <h3>Deductions</h3>
            <table>
                <tr><th>Name</th><th class="amount">Amount</th></tr>
                @forelse ($deductions as $line)
                    <tr><td>{{ $line->name }}</td><td class="amount">{{ $money($line->amount) }}</td></tr>
                @empty
                    <tr><td colspan="2">No deductions</td></tr>
                @endforelse
            </table>
        </div>
    </div>

    @if($contributions->count())
        <div class="box">
            <h3>Employer Contributions</h3>
            <table>
                <tr><th>Name</th><th class="amount">Amount</th></tr>
                @foreach ($contributions as $line)
                    <tr><td>{{ $line->name }}</td><td class="amount">{{ $money($line->amount) }}</td></tr>
                @endforeach
            </table>
        </div>
    @endif

    <table class="summary">
        <tr><td>Gross Earnings</td><td class="amount">{{ $money($payslip->gross_earnings) }}</td></tr>
        <tr><td>Total Deductions</td><td class="amount">{{ $money($payslip->total_deductions) }}</td></tr>
        <tr><td class="total">Net Payable</td><td class="amount total">{{ $money($payslip->net_payable ?: $payslip->total_payable) }}</td></tr>
        <tr><td>Payment Status</td><td class="amount">{{ $payslip->payment_status ?: 'UNPAID' }}</td></tr>
    </table>
</body>
</html>
