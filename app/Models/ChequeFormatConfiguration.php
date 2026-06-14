<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChequeFormatConfiguration extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'country',
        'format_name',
        'paper_size',
        'width',
        'height',
        'date_position',
        'payee_name_position',
        'amount_number_position',
        'amount_words_position',
        'signature_position',
        'layout_json',
        'signature_image',
        'signature_width',
        'signature_height',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'width' => 'decimal:2',
            'height' => 'decimal:2',
            'layout_json' => 'array',
            'signature_width' => 'integer',
            'signature_height' => 'integer',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    /**
     * Sensible default field positions (millimetres) on a 210x90mm cheque.
     */
    public static function defaultLayout(): array
    {
        return [
            'fields' => [
                'date' => ['x' => 150, 'y' => 8, 'font_size' => 11, 'font_weight' => 'normal', 'align' => 'left', 'visible' => true],
                'payee_name' => ['x' => 22, 'y' => 26, 'font_size' => 12, 'font_weight' => 'bold', 'align' => 'left', 'visible' => true],
                'amount_words' => ['x' => 22, 'y' => 40, 'font_size' => 11, 'font_weight' => 'normal', 'align' => 'left', 'visible' => true],
                'amount_number' => ['x' => 150, 'y' => 40, 'font_size' => 12, 'font_weight' => 'bold', 'align' => 'left', 'visible' => true],
                'signature' => ['x' => 150, 'y' => 64, 'font_size' => 10, 'font_weight' => 'normal', 'align' => 'left', 'visible' => true],
            ],
        ];
    }

    /**
     * Resolve the active/default cheque format, seeding one on first use.
     */
    public static function activeDefault(): self
    {
        $format = static::query()->where('active', true)->orderBy('created_at')->first()
            ?? static::query()->orderBy('created_at')->first();

        if ($format) {
            return $format;
        }

        return static::query()->create([
            'country' => 'Global',
            'format_name' => 'Default Cheque Format',
            'paper_size' => 'Custom',
            'width' => 210,
            'height' => 90,
            'layout_json' => static::defaultLayout(),
            'active' => true,
            'is_system_generated' => true,
        ]);
    }
}
