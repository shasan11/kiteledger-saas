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

        $sheet->setCellValue("A{$rowIndex}", $report['company_name'] ?? config('app.name'));
        $rowIndex++;
        $sheet->setCellValue("A{$rowIndex}", $report['title'] ?? 'Report');
        $rowIndex++;
        $sheet->setCellValue("A{$rowIndex}", 'Generated At');
        $sheet->setCellValue("B{$rowIndex}", $report['generated_at'] ?? now()->format('Y-m-d H:i:s'));
        $rowIndex += 2;

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
        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }

        return $value;
    }
}
