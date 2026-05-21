<?php

namespace App\Services\AI;

class AiResponseFormatter
{
    public function success(array $data, string $message = 'OK'): array
    {
        return [
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ];
    }

    public function error(string $message, int $code = 422): array
    {
        return [
            'success' => false,
            'message' => $message,
            'data'    => null,
        ];
    }

    public function fromProviderResult(array $result): array
    {
        return [
            'success'  => $result['success'] ?? false,
            'provider' => $result['provider'] ?? null,
            'model'    => $result['model']    ?? null,
            'tokens'   => $result['tokens']   ?? [],
            'data'     => $result['data']     ?? [],
            'text'     => $result['text']     ?? null,
        ];
    }
}
