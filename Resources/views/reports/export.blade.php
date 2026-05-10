<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $report['title'] ?? 'Report' }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; }
        h1 { font-size: 20px; margin: 0 0 6px; }
        .meta { margin-bottom: 14px; }
        .meta p { margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
        th { background: #f3f4f6; text-align: left; }
        .totals { margin-top: 16px; width: 40%; }
        .totals td:first-child { font-weight: bold; }
    </style>
</head>
<body>
    <h1>{{ $report['title'] ?? 'Report' }}</h1>
    <div class="meta">
        <p>{{ $report['company_name'] ?? config('app.name') }}</p>
        <p>Generated: {{ $report['generated_at'] ?? now()->format('Y-m-d H:i:s') }}</p>
        <p>Period: {{ data_get($report, 'period.from', '-') }} to {{ data_get($report, 'period.to', '-') }}</p>
    </div>

    <table>
        <thead>
            <tr>
                @foreach($headers as $header)
                    <th>{{ $header }}</th>
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
                    <td colspan="{{ max(count($headers), 1) }}">No records found.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    @if(!empty($report['totals']))
        <table class="totals">
            <tbody>
                @foreach($report['totals'] as $label => $value)
                    <tr>
                        <td>{{ \Illuminate\Support\Str::headline((string) $label) }}</td>
                        <td>{{ $value }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
