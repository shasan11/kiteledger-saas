<?php

namespace Database\Seeders;

use App\Models\CrmActivityComment;
use Illuminate\Database\Seeder;

class CrmActivityCommentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CrmActivityComment::factory()->count(5)->create();
    }
}
