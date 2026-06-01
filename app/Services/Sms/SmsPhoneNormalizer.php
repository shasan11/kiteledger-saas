<?php

namespace App\Services\Sms;

class SmsPhoneNormalizer
{
    public function normalize(string $phone, ?string $defaultCountryCode = null): string
    {
        $phone = trim(preg_replace('/[^\d+]/', '', $phone) ?: '');
        $countryCode = $this->cleanCountryCode($defaultCountryCode);

        if ($phone === '') {
            return '';
        }

        if (str_starts_with($phone, '00')) {
            return '+' . substr($phone, 2);
        }

        if (str_starts_with($phone, '+')) {
            return '+' . preg_replace('/\D/', '', substr($phone, 1));
        }

        $digits = preg_replace('/\D/', '', $phone) ?: '';
        if ($countryCode && str_starts_with($digits, '0')) {
            $digits = ltrim($digits, '0');
        }

        return $countryCode ? "+{$countryCode}{$digits}" : $digits;
    }

    public function isValid(string $phone): bool
    {
        $digits = preg_replace('/\D/', '', $phone) ?: '';

        return strlen($digits) >= 7 && strlen($digits) <= 15;
    }

    private function cleanCountryCode(?string $countryCode): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $countryCode) ?: '';

        return $digits !== '' ? $digits : null;
    }
}
