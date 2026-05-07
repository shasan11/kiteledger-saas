<?php

namespace App\Services\Reports;

use Illuminate\Http\Response;
use Illuminate\Support\Str;

class ReportExportService
{
    public function export(array $report, string $format): Response
    {
        return match ($format) {
            'csv' => $this->csv($report),
            'xlsx' => $this->xlsx($report),
            'pdf' => $this->pdfLikeHtml($report),
            default => abort(422, 'Unsupported export format.'),
        };
    }

    protected function csv(array $report): Response
    {
        $filename = $this->filename($report, 'csv');
        $handle = fopen('php://temp', 'r+');

        fputcsv($handle, [$report['company_name'] ?? config('app.name')]);
        fputcsv($handle, [$report['title'] ?? 'Report']);
        fputcsv($handle, ['Generated At', $report['generated_at'] ?? now()->format('Y-m-d H:i:s')]);
        fputcsv($handle, []);
        fputcsv($handle, array_map(fn ($column) => $column['title'] ?? $column['label'] ?? $column['key'], $report['columns'] ?? []));

        foreach ($report['rows'] ?? [] as $row) {
            fputcsv($handle, array_map(fn ($column) => data_get($row, $column['key'] ?? '', ''), $report['columns'] ?? []));
        }

        if (!empty($report['totals'])) {
            fputcsv($handle, []);
            foreach ($report['totals'] as $label => $value) {
                fputcsv($handle, [Str::headline((string) $label), $value]);
            }
        }

        rewind($handle);
        $content = stream_get_contents($handle) ?: '';
        fclose($handle);

        return response($content, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    protected function xlsx(array $report): Response
    {
        $filename = $this->filename($report, 'xlsx');
        $html = $this->tableHtml($report);

        return response($html, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    protected function pdfLikeHtml(array $report): Response
    {
        $filename = $this->filename($report, 'pdf');
        $html = $this->tableHtml($report, true);

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => "inline; filename=\"{$filename}\"",
        ]);
    }

    protected function filename(array $report, string $extension): string
    {
        $from = data_get($report, 'period.from', 'na');
        $to = data_get($report, 'period.to', 'na');
        $key = data_get($report, 'report_key', 'report');

        return "{$key}_{$from}_{$to}.{$extension}";
    }

    protected function tableHtml(array $report, bool $print = false): string
    {
        $headers = array_map(fn ($column) => $column['title'] ?? $column['label'] ?? $column['key'], $report['columns'] ?? []);
        $rows = '';

        foreach ($report['rows'] ?? [] as $row) {
            $cells = '';
            foreach ($report['columns'] ?? [] as $column) {
                $value = e((string) data_get($row, $column['key'] ?? '', ''));
                $cells .= "<td>{$value}</td>";
            }
            $rows .= "<tr>{$cells}</tr>";
        }

        return '<!doctype html><html><head><meta charset="utf-8"><title>'
            . e($report['title'] ?? 'Report')
            . '</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111827}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d1d5db;padding:8px;font-size:12px;text-align:left}h1{font-size:20px;margin:0 0 8px}p{margin:4px 0}'
            . ($print ? '@media print{body{padding:0}}' : '')
            . '</style></head><body>'
            . '<h1>' . e($report['title'] ?? 'Report') . '</h1>'
            . '<p>' . e($report['company_name'] ?? config('app.name')) . '</p>'
            . '<p>Generated: ' . e($report['generated_at'] ?? now()->format('Y-m-d H:i:s')) . '</p>'
            . '<table><thead><tr>'
            . collect($headers)->map(fn ($header) => '<th>' . e($header) . '</th>')->implode('')
            . '</tr></thead><tbody>' . $rows . '</tbody></table></body></html>';
    }
}
