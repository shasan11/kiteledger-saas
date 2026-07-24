<?php

namespace App\Services\SaaS;

class InvoiceFormatter
{
    public function number(float|int|string|null $value, array $custom, int $precision = 2): string
    {
        [$decimal, $thousands] = match ((string) data_get($custom, 'invoice_customization.number_format', '1,234.56')) {
            '1.234,56' => [',', '.'],
            '1 234,56' => [',', ' '],
            default => ['.', ','],
        };

        return number_format((float) $value, $precision, $decimal, $thousands);
    }

    public function money(float|int|string|null $value, string $currency, array $custom): string
    {
        $number = $this->number($value, $custom);
        if (data_get($custom, 'invoice_customization.currency_format', 'code') !== 'symbol') {
            return strtoupper($currency).' '.$number;
        }
        $symbol = ['USD' => '$', 'EUR' => '€', 'GBP' => '£', 'NPR' => 'रु', 'INR' => '₹', 'AED' => 'د.إ'][strtoupper($currency)] ?? strtoupper($currency).' ';

        return $symbol.$number;
    }

    public function localAsset(?string $value): ?string
    {
        if (blank($value)) {
            return null;
        }
        $path = parse_url($value, PHP_URL_PATH);
        if (! is_string($path) || ! str_starts_with('/'.ltrim($path, '/'), '/storage/')) {
            return null;
        }
        $relative = ltrim(str($path)->after('/storage/')->toString(), '/');
        $storageRoot = realpath(storage_path('app/public'));
        $candidate = $storageRoot ? realpath($storageRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative)) : false;
        if (! $candidate || ! $storageRoot || ! str_starts_with(str_replace('\\', '/', $candidate), rtrim(str_replace('\\', '/', $storageRoot), '/').'/')) {
            return null;
        }

        return $candidate;
    }
}
