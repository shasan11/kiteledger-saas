<?php

namespace App\Services\SaaS;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class InvoiceNumberService
{
    public function next(array $settings, ?CarbonInterface $date = null): string
    {
        $date ??= now();
        $annual = (bool) data_get($settings, 'invoice_customization.annual_reset', false);
        $period = $annual ? $date->format('Y') : 'global';
        $starting = max(1, (int) data_get($settings, 'invoice_customization.starting_number', data_get($settings, 'billing.invoice_starting_number', 1)));
        $connection = DB::connection(config('tenancy.database.central_connection'));
        $connection->table('invoice_number_sequences')->insertOrIgnore([
            'period' => $period,
            'last_number' => $starting - 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $sequence = $connection->table('invoice_number_sequences')->where('period', $period)->lockForUpdate()->first();
        $number = max($starting, ((int) $sequence->last_number) + 1);
        $connection->table('invoice_number_sequences')->where('id', $sequence->id)->update(['last_number' => $number, 'updated_at' => now()]);

        return $this->format($settings, $number, $date);
    }

    public function preview(array $settings, ?CarbonInterface $date = null): string
    {
        $number = max(1, (int) data_get($settings, 'invoice_customization.starting_number', data_get($settings, 'billing.invoice_starting_number', 1)));

        return $this->format($settings, $number, $date ?? now());
    }

    private function format(array $settings, int $number, CarbonInterface $date): string
    {
        $prefix = (string) data_get($settings, 'invoice_customization.prefix', data_get($settings, 'billing.invoice_prefix', 'INV-'));
        $suffix = (string) data_get($settings, 'invoice_customization.suffix', '');
        $digits = max(1, min(12, (int) data_get($settings, 'invoice_customization.minimum_digits', 6)));
        if ((bool) data_get($settings, 'invoice_customization.annual_reset', false)) {
            $prefix = str_contains($prefix, '{year}') ? str_replace('{year}', $date->format('Y'), $prefix) : $prefix.$date->format('Y').'-';
        }

        return $prefix.str_pad((string) $number, $digits, '0', STR_PAD_LEFT).$suffix;
    }
}
