<?php

namespace App\Services\SaaS;

use Illuminate\Support\Str;

class TotpService
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function generateSecret(int $bytes = 20): string
    {
        return $this->base32Encode(random_bytes($bytes));
    }

    public function verify(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\D/', '', $code);
        if (strlen($code) !== 6) {
            return false;
        }
        $counter = intdiv(time(), 30);
        for ($offset = -$window; $offset <= $window; $offset++) {
            if (hash_equals($this->code($secret, $counter + $offset), $code)) {
                return true;
            }
        }

        return false;
    }

    public function uri(string $secret, string $email): string
    {
        $issuer = rawurlencode((string) config('app.name', 'KiteLedger'));
        $label = rawurlencode(config('app.name', 'KiteLedger').':'.$email);

        return "otpauth://totp/{$label}?secret={$secret}&issuer={$issuer}&digits=6&period=30";
    }

    public function recoveryCodes(int $count = 8): array
    {
        return collect(range(1, $count))->map(fn (): string => strtoupper(Str::random(5).'-'.Str::random(5)))->all();
    }

    private function code(string $secret, int $counter): string
    {
        $binaryCounter = pack('N2', 0, $counter);
        $hash = hash_hmac('sha1', $binaryCounter, $this->base32Decode($secret), true);
        $offset = ord($hash[19]) & 0x0F;
        $number = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($number % 1_000_000), 6, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $data): string
    {
        $bits = '';
        foreach (str_split($data) as $character) {
            $bits .= str_pad(decbin(ord($character)), 8, '0', STR_PAD_LEFT);
        }

        return collect(str_split($bits, 5))->map(function (string $chunk): string {
            $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);

            return self::ALPHABET[bindec($chunk)];
        })->implode('');
    }

    private function base32Decode(string $secret): string
    {
        $bits = '';
        foreach (str_split(strtoupper(preg_replace('/[^A-Z2-7]/i', '', $secret))) as $character) {
            $position = strpos(self::ALPHABET, $character);
            if ($position === false) {
                continue;
            }
            $bits .= str_pad(decbin($position), 5, '0', STR_PAD_LEFT);
        }
        $decoded = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $decoded .= chr(bindec($chunk));
            }
        }

        return $decoded;
    }
}
