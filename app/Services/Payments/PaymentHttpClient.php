<?php

namespace App\Services\Payments;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class PaymentHttpClient
{
    public static function request(): PendingRequest
    {
        $request = Http::acceptJson()->timeout(30);
        $caBundle = self::caBundlePath();

        return $caBundle
            ? $request->withOptions(['verify' => $caBundle])
            : $request;
    }

    public static function caBundlePath(): ?string
    {
        $configured = trim((string) config('services.payment_gateways.ca_bundle', ''));

        if ($configured !== '') {
            if (!is_file($configured) || !is_readable($configured)) {
                throw new \RuntimeException(
                    'The configured payment gateway CA bundle is missing or unreadable: ' . $configured
                );
            }

            return $configured;
        }

        $opensslLocations = openssl_get_cert_locations();
        $programFiles = getenv('ProgramFiles') ?: 'C:/Program Files';
        $phpDirectory = dirname(PHP_BINARY);

        $candidates = [
            ini_get('curl.cainfo'),
            ini_get('openssl.cafile'),
            getenv('CURL_CA_BUNDLE'),
            getenv('SSL_CERT_FILE'),
            $opensslLocations['default_cert_file'] ?? null,
            $phpDirectory . '/extras/ssl/cacert.pem',
            'C:/laragon/etc/ssl/cacert.pem',
            $programFiles . '/Git/mingw64/etc/ssl/certs/ca-bundle.crt',
            $programFiles . '/Git/usr/ssl/certs/ca-bundle.crt',
            '/etc/ssl/certs/ca-certificates.crt',
            '/etc/pki/tls/certs/ca-bundle.crt',
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && $candidate !== '' && is_file($candidate) && is_readable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
