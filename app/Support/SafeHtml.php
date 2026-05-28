<?php

namespace App\Support;

class SafeHtml
{
    public static function clean(?string $html): ?string
    {
        $html = trim((string) ($html ?? ''));

        if ($html === '') {
            return null;
        }

        $allowed = '<p><br><strong><b><em><i><u><ul><ol><li><a><table><thead><tbody><tr><th><td><hr><span>';
        $html = strip_tags($html, $allowed);
        $html = preg_replace('/\s+on[a-z]+\s*=\s*(".*?"|\'.*?\'|[^\s>]+)/i', '', $html) ?? $html;
        $html = preg_replace('/\s+(href|src)\s*=\s*("|\')?\s*javascript:[^"\'>\s]*\2?/i', '', $html) ?? $html;
        $html = preg_replace('/\s+style\s*=\s*(".*?"|\'.*?\'|[^\s>]+)/i', '', $html) ?? $html;

        return trim($html) ?: null;
    }
}
