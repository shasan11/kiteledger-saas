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
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'width' => 'decimal:2',
            'height' => 'decimal:2',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }
}
