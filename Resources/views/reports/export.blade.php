<!doctype html>
<html lang="{{ app()->getLocale() }}" dir="{{ app(\App\Services\LocalizationService::class)->direction(app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <title>{{ $report['title'] ?? 'Report' }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111827; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .company { border-bottom: 1.5px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
        .company .name { font-size: 16px; font-weight: bold; margin: 0 0 2px; }
        .company .line { margin: 1px 0; font-size: 10.5px; color: #374151; }
        .company .tax-line { margin-top: 3px; font-size: 10px; color: #4b5563; }
        .report-title { font-size: 14px; font-weight: bold; margin: 6px 0 2px; }
        .meta { margin-bottom: 12px; font-size: 10.5px; color: #4b5563; }
        .meta p { margin: 1px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #d1d5db; padding: 4px 6px; vertical-align: top; font-size: 10px; }
        th { background: #f3f4f6; text-align: left; }
        .totals { margin-top: 14px; width: 40%; }
        .totals td:first-child { font-weight: bold; }
    </style>
</head>
<body>
    @php
        $company = $report['company'] ?? [];
        $tr = fn (string $key) => app(\App\Services\LocalizationService::class)
            ->translationsFor(app()->getLocale())[$key] ?? $key;
    @endphp

    @if(!empty($company['name']) || !empty($company['address']) || !empty($company['phone']))
        <div class="company">
            @if(!empty($company['name']))
                <p class="name">{{ $company['name'] }}</p>
            @endif
            @if(!empty($company['tag_line']))
                <p class="line">{{ $company['tag_line'] }}</p>
            @endif
            @if(!empty($company['address']))
                <p class="line">{{ $company['address'] }}</p>
            @endif
            @php($contactBits = array_filter([
                !empty($company['phone']) ? $tr('Phone') . ': ' . $company['phone'] : null,
                !empty($company['email']) ? $tr('Email') . ': ' . $company['email'] : null,
                !empty($company['website']) ? $company['website'] : null,
            ]))
            @if(!empty($contactBits))
                <p class="line">{{ implode('   ·   ', $contactBits) }}</p>
            @endif
            @php($taxBits = array_filter([
                !empty($company['tax_number']) ? $tr('Tax No') . ': ' . $company['tax_number'] : null,
                !empty($company['vat_number']) ? $tr('VAT No') . ': ' . $company['vat_number'] : null,
                !empty($company['registration_number']) ? $tr('Reg No') . ': ' . $company['registration_number'] : null,
            ]))
            @if(!empty($taxBits))
                <p class="tax-line">{{ implode('   ·   ', $taxBits) }}</p>
            @endif
        </div>
    @endif

    <p class="report-title">{{ $report['title'] ?? 'Report' }}</p>
    <div class="meta">
        <p>{{ $tr('Generated') }}: {{ $report['generated_at'] ?? now()->format('Y-m-d H:i:s') }}</p>
        @if(!empty(data_get($report, 'period.from')) || !empty(data_get($report, 'period.to')))
            <p>{{ $tr('Period') }}: {{ data_get($report, 'period.from', '-') }} {{ $tr('to') }} {{ data_get($report, 'period.to', '-') }}</p>
        @endif
    </div>

    <table>
        <thead>
            <tr>
                @foreach($headers as $header)
                    <th>{{ $tr((string) $header) }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse(($report['rows'] ?? []) as $row)
                <tr>
                    @foreach(($report['columns'] ?? []) as $column)
                        <td>{{ data_get($row, $column['key'] ?? '', '') }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ max(count($headers), 1) }}">{{ $tr('No records found.') }}</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    @if(!empty($report['totals']))
        <table class="totals">
            <tbody>
                @foreach($report['totals'] as $label => $value)
                    <tr>
                        <td>{{ $tr(\Illuminate\Support\Str::headline((string) $label)) }}</td>
                        <td>{{ $value }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
