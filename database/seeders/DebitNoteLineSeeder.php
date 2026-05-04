<?php

namespace Database\Seeders;

use App\Models\DebitNoteLine;
use Illuminate\Database\Seeder;

class DebitNoteLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DebitNoteLine::factory()->count(5)->create();
    }
}
