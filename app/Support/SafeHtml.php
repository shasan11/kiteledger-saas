<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

class SafeHtml
{
    private const TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'img', 'iframe', 'div'];

    public static function clean(?string $html): ?string
    {
        $html = trim((string) ($html ?? ''));
        if ($html === '') {
            return null;
        }
        if (! class_exists(DOMDocument::class)) {
            return self::fallback($html);
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="utf-8" ?><div id="safe-html-root">'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        $root = $document->getElementById('safe-html-root');
        if (! $root) {
            return null;
        }
        self::sanitizeChildren($root);

        $clean = '';
        foreach ($root->childNodes as $child) {
            $clean .= $document->saveHTML($child);
        }

        return trim($clean) ?: null;
    }

    private static function sanitizeChildren(DOMNode $parent): void
    {
        foreach (iterator_to_array($parent->childNodes) as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }
            $tag = strtolower($node->tagName);
            if (! in_array($tag, self::TAGS, true)) {
                if (in_array($tag, ['script', 'style', 'object', 'embed', 'form', 'input', 'button', 'svg', 'math'], true)) {
                    $node->parentNode?->removeChild($node);

                    continue;
                }
                self::sanitizeChildren($node);
                while ($node->firstChild) {
                    $node->parentNode?->insertBefore($node->firstChild, $node);
                }
                $node->parentNode?->removeChild($node);

                continue;
            }
            self::sanitizeAttributes($node, $tag);
            self::sanitizeChildren($node);
        }
    }

    private static function sanitizeAttributes(DOMElement $element, string $tag): void
    {
        $allowed = match ($tag) {
            'a' => ['href', 'title', 'target'], 'img' => ['src', 'alt', 'title', 'data-align'],
            'iframe' => ['src', 'width', 'height', 'title', 'allowfullscreen'], 'blockquote' => ['data-variant'],
            'th', 'td' => ['colspan', 'rowspan'], default => [],
        };
        foreach (iterator_to_array($element->attributes) as $attribute) {
            if (! in_array(strtolower($attribute->name), $allowed, true)) {
                $element->removeAttributeNode($attribute);
            }
        }

        if ($tag === 'a') {
            if (! self::safeUrl($element->getAttribute('href'), false)) {
                $element->removeAttribute('href');
            }
            if ($element->getAttribute('target') === '_blank') {
                $element->setAttribute('rel', 'noopener noreferrer');
            } else {
                $element->removeAttribute('target');
            }
        }
        if ($tag === 'img' && ! self::safeUrl($element->getAttribute('src'), true)) {
            $element->parentNode?->removeChild($element);
        }
        if ($tag === 'iframe') {
            $url = parse_url($element->getAttribute('src'));
            $host = strtolower($url['host'] ?? '');
            $path = $url['path'] ?? '';
            if (($url['scheme'] ?? '') !== 'https' || ! in_array($host, ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'], true) || ! str_starts_with($path, '/embed/')) {
                $element->parentNode?->removeChild($element);

                return;
            }
            $element->setAttribute('loading', 'lazy');
            $element->setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        }
        if ($tag === 'blockquote' && $element->getAttribute('data-variant') !== 'callout') {
            $element->setAttribute('data-variant', 'quote');
        }
        if ($tag === 'img' && ! in_array($element->getAttribute('data-align'), ['left', 'center', 'right'], true)) {
            $element->setAttribute('data-align', 'center');
        }
    }

    private static function safeUrl(string $url, bool $image): bool
    {
        $url = trim($url);
        if ($url === '' || str_starts_with($url, '/') || str_starts_with($url, '#')) {
            return true;
        }
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        return in_array($scheme, $image ? ['http', 'https'] : ['http', 'https', 'mailto'], true);
    }

    private static function fallback(string $html): ?string
    {
        $allowed = '<p><br><strong><b><em><i><u><s><strike><ul><ol><li><a><table><thead><tbody><tr><th><td><hr><span><h2><h3><h4><h5><h6><blockquote><code><pre><img><iframe><div>';
        $html = strip_tags($html, $allowed);
        $html = preg_replace('/\s+on[a-z]+\s*=\s*(".*?"|\'.*?\'|[^\s>]+)/i', '', $html) ?? $html;
        $html = preg_replace('/\s+(href|src)\s*=\s*("|\')?\s*(javascript|data):[^"\'>\s]*\2?/i', '', $html) ?? $html;
        $html = preg_replace('/\s+style\s*=\s*(".*?"|\'.*?\'|[^\s>]+)/i', '', $html) ?? $html;

        return trim($html) ?: null;
    }
}
