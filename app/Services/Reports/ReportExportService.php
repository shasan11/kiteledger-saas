<?php

namespace App\Services\Reports;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportExportService
{
    public function export(array $report, string $format): Response|StreamedResponse
    {
        return match ($format) {
            'csv' => $this->csv($report),
            'xlsx' => $this->xlsx($report),
            'pdf' => $this->pdf($report),
            default => abort(422, 'Unsupported export format.'),
        };
    }

    protected function csv(array $report): StreamedResponse
    {
        $filename = $this->filename($report, 'csv');
        $spreadsheet = $this->spreadsheet($report);
        $writer = new Csv($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    protected function xlsx(array $report): StreamedResponse
    {
        $filename = $this->filename($report, 'xlsx');
        $spreadsheet = $this->spreadsheet($report);
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    protected function pdf(array $report): Response
    {
        $filename = $this->filename($report, 'pdf');
        $pdf = Pdf::loadView('reports.export', [
            'report' => $report,
            'headers' => $this->headers($report),
        ])->setPaper('a4', 'landscape');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    protected function filename(array $report, string $extension): string
    {
        $from = data_get($report, 'period.from', 'na');
        $to = data_get($report, 'period.to', 'na');
        $key = data_get($report, 'report_key', 'report');

        return "{$key}_{$from}_{$to}.{$extension}";
    }

    protected function headers(array $report): array
    {
        return array_map(fn ($column) => $column['title'] ?? $column['label'] ?? $column['key'], $report['columns'] ?? []);
    }

    protected function spreadsheet(array $report): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $headers = $this->headers($report);
        $rowIndex = 1;

        $company = $report['company'] ?? [];

        if (!empty($company['name'])) {
            $sheet->setCellValue("A{$rowIndex}", $company['name']);
            $sheet->getStyle("A{$rowIndex}")->getFont()->setBold(true)->setSize(14);
            $rowIndex++;
        }
        foreach (['address', 'phone', 'email', 'website'] as $field) {
            if (!empty($company[$field])) {
                $label = $field === 'address' ? '' : ucfirst($field) . ': ';
                $sheet->setCellValue("A{$rowIndex}", $label . $company[$field]);
                $rowIndex++;
            }
        }
        $taxBits = array_filter([
            !empty($company['tax_number']) ? 'Tax: ' . $company['tax_number'] : null,
            !empty($company['vat_number']) ? 'VAT: ' . $company['vat_number'] : null,
            !empty($company['registration_number']) ? 'Reg: ' . $company['registration_number'] : null,
        ]);
        if ($taxBits) {
            $sheet->setCellValue("A{$rowIndex}", implode('   ', $taxBits));
            $rowIndex++;
        }
        $rowIndex++;

        $sheet->setCellValue("A{$rowIndex}", $report['title'] ?? 'Report');
        $sheet->getStyle("A{$rowIndex}")->getFont()->setBold(true)->setSize(12);
        $rowIndex++;
        $sheet->setCellValue("A{$rowIndex}", 'Generated At');
        $sheet->setCellValue("B{$rowIndex}", $report['generated_at'] ?? now()->format('Y-m-d H:i:s'));
        $rowIndex++;
        $period = $report['period'] ?? [];
        if (!empty($period['from']) || !empty($period['to'])) {
            $sheet->setCellValue("A{$rowIndex}", 'Period');
            $sheet->setCellValue("B{$rowIndex}", trim(($period['from'] ?? '-') . ' to ' . ($period['to'] ?? '-')));
            $rowIndex++;
        }
        $rowIndex++;

        foreach ($headers as $index => $header) {
            $sheet->setCellValue($this->cellReference($index + 1, $rowIndex), $header);
        }

        $rowIndex++;

        foreach ($report['rows'] ?? [] as $row) {
            foreach ($report['columns'] ?? [] as $index => $column) {
                $sheet->setCellValue(
                    $this->cellReference($index + 1, $rowIndex),
                    $this->cellValue(data_get($row, $column['key'] ?? '', ''))
                );
            }
            $rowIndex++;
        }

        if (!empty($report['totals'])) {
            $rowIndex++;
            foreach ($report['totals'] as $label => $value) {
                $sheet->setCellValue("A{$rowIndex}", Str::headline((string) $label));
                $sheet->setCellValue("B{$rowIndex}", $this->cellValue($value));
                $rowIndex++;
            }
        }

        foreach (range(1, max(count($headers), 2)) as $column) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($column))->setAutoSize(true);
        }

        return $spreadsheet;
    }

    protected function cellReference(int $columnIndex, int $rowIndex): string
    {
        return Coordinate::stringFromColumnIndex($columnIndex) . $rowIndex;
    }

    protected function cellValue(mixed $value): mixed
    {
        if (is_null($value)) return '';
        if (is_bool($value)) return $value ? 'Yes' : 'No';
        if (is_array($value)) return data_get($value, 'name') ?? data_get($value, 'code') ?? json_encode($value);
        if (is_object($value)) return data_get($value, 'name') ?? data_get($value, 'code') ?? (string) $value;
        return $value;
    }
}
