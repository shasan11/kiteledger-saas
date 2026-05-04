<?php

namespace Database\Seeders;

use App\Models\DebitNote;
use Illuminate\Database\Seeder;

class DebitNoteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DebitNote::factory()->count(5)->create();
    }
}
