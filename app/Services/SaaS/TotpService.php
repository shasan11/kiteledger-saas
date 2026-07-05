<?php

namespace App\Services\SaaS;

class TotpService
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function generateSecret(int $length = 32): string
    {
        $out = '';
        for ($i = 0; $i < $length; $i++) {
            $out .= self::ALPHABET[random_int(0, 31)];
        }

        return $out;
    }

    public function verify(string $secret, string $code, int $window = 1): bool
    {
        if (! preg_match('/^\d{6}$/', $code)) {
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
        return 'otpauth://totp/'.rawurlencode(config('app.name').':'.$email).'?secret='.$secret.'&issuer='.rawurlencode(config('app.name')).'&digits=6&period=30';
    }

    private function code(string $secret, int $counter): string
    {
        $binary = $this->decode($secret);
        $time = pack('N*', 0).pack('N*', $counter);
        $hash = hash_hmac('sha1', $time, $binary, true);
        $offset = ord(substr($hash, -1)) & 0x0F;
        $value = unpack('N', substr($hash, $offset, 4))[1] & 0x7FFFFFFF;

        return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
    }

    private function decode(string $secret): string
    {
        $bits = '';
        foreach (str_split(strtoupper($secret)) as $char) {
            $position = strpos(self::ALPHABET, $char);
            if ($position === false) {
                continue;
            } $bits .= str_pad(decbin($position), 5, '0', STR_PAD_LEFT);
        }
        $output = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $output .= chr(bindec($byte));
            }
        }

        return $output;
    }
}
