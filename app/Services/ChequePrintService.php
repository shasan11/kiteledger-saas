<?php

namespace App\Services;

use App\Models\ChequeFormatConfiguration;
use App\Models\ChequeRegister;
use Illuminate\Support\Carbon;

class ChequePrintService
{
    /**
     * Build the view data used to render a printable cheque using the
     * positions configured in the active/default cheque format.
     *
     * @return array<string, mixed>
     */
    public function viewData(ChequeRegister $cheque, ?ChequeFormatConfiguration $format = null): array
    {
        $format = $format ?: ChequeFormatConfiguration::activeDefault();

        $layout = $format->layout_json ?: ChequeFormatConfiguration::defaultLayout();
        $fields = $layout['fields'] ?? [];

        $width = (float) ($format->width ?: 210);
        $height = (float) ($format->height ?: 90);

        $cheque->loadMissing(['relatedAccount', 'account']);

        $payee = $cheque->payee_name
            ?: $cheque->relatedAccount?->name
            ?: '';

        $amount = (float) $cheque->amount;
        $date = $cheque->cheque_date ?: $cheque->issued_date;

        $values = [
            'date' => $date ? Carbon::parse($date)->format('d-m-Y') : '',
            'payee_name' => $payee,
            'amount_words' => $this->amountToWords($amount),
            'amount_number' => number_format($amount, 2),
            'signature' => '',
        ];

        $resolved = [];

        foreach (['date', 'payee_name', 'amount_words', 'amount_number', 'signature'] as $key) {
            $config = $fields[$key] ?? [];

            if (($config['visible'] ?? true) === false) {
                continue;
            }

            $resolved[$key] = [
                'x' => (float) ($config['x'] ?? 0),
                'y' => (float) ($config['y'] ?? 0),
                'font_size' => (int) ($config['font_size'] ?? 11),
                'font_weight' => in_array(($config['font_weight'] ?? 'normal'), ['bold', 'normal'], true) ? $config['font_weight'] : 'normal',
                'align' => in_array(($config['align'] ?? 'left'), ['left', 'center', 'right'], true) ? $config['align'] : 'left',
                'text' => $values[$key] ?? '',
            ];
        }

        return [
            'width' => $width,
            'height' => $height,
            'fields' => $resolved,
            'signature_image' => $format->signature_image,
            'signature_width' => $format->signature_width ?: 40,
            'signature_height' => $format->signature_height ?: 18,
            'cheque' => $cheque,
        ];
    }

    /**
     * Convert an amount to English words, e.g. 1250.50 -> "One Thousand Two
     * Hundred Fifty and Fifty Paisa Only".
     */
    public function amountToWords(float $amount): string
    {
        $amount = round($amount, 2);
        $whole = (int) floor($amount);
        $fraction = (int) round(($amount - $whole) * 100);

        $words = $this->numberToWords($whole);
        $words = $words === '' ? 'Zero' : $words;

        $result = ucwords($words);

        if ($fraction > 0) {
            $result .= ' and ' . ucwords($this->numberToWords($fraction)) . ' Paisa';
        }

        return trim($result) . ' Only';
    }

    private function numberToWords(int $number): string
    {
        if ($number < 0) {
            return 'Minus ' . $this->numberToWords(abs($number));
        }

        if ($number === 0) {
            return '';
        }

        $ones = [
            0 => '', 1 => 'one', 2 => 'two', 3 => 'three', 4 => 'four', 5 => 'five',
            6 => 'six', 7 => 'seven', 8 => 'eight', 9 => 'nine', 10 => 'ten',
            11 => 'eleven', 12 => 'twelve', 13 => 'thirteen', 14 => 'fourteen',
            15 => 'fifteen', 16 => 'sixteen', 17 => 'seventeen', 18 => 'eighteen', 19 => 'nineteen',
        ];
        $tens = [
            2 => 'twenty', 3 => 'thirty', 4 => 'forty', 5 => 'fifty',
            6 => 'sixty', 7 => 'seventy', 8 => 'eighty', 9 => 'ninety',
        ];

        $words = [];

        // International scale: billion / million / thousand / hundred.
        $scales = [
            1000000000 => 'billion',
            1000000 => 'million',
            1000 => 'thousand',
            100 => 'hundred',
        ];

        foreach ($scales as $value => $name) {
            if ($number >= $value) {
                $words[] = $this->numberToWords((int) floor($number / $value)) . ' ' . $name;
                $number %= $value;
            }
        }

        if ($number >= 20) {
            $word = $tens[(int) floor($number / 10)];
            $number %= 10;
            $words[] = $number > 0 ? $word . '-' . $ones[$number] : $word;
        } elseif ($number > 0) {
            $words[] = $ones[$number];
        }

        return trim(implode(' ', array_filter($words)));
    }
}
