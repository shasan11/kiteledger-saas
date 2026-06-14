<?php

namespace Database\Seeders;

use App\Models\Language;
use Illuminate\Database\Seeder;

class LanguageSeeder extends Seeder
{
    public function run(): void
    {
        $languages = [
            ['code' => 'en', 'name' => 'English', 'native_name' => 'English', 'direction' => 'ltr', 'is_default' => true, 'sort_order' => 0],
            ['code' => 'ne', 'name' => 'Nepali', 'native_name' => 'नेपाली', 'direction' => 'ltr', 'is_default' => false, 'sort_order' => 10],
            ['code' => 'ar', 'name' => 'Arabic', 'native_name' => 'العربية', 'direction' => 'rtl', 'is_default' => false, 'sort_order' => 20],
        ];

        foreach ($languages as $language) {
            $path = resource_path("lang/{$language['code']}.json");
            $translations = [];

            if (is_file($path)) {
                try {
                    $translations = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
                } catch (\Throwable) {
                    $translations = [];
                }
            }

            Language::query()->updateOrCreate(
                ['code' => $language['code']],
                [
                    ...$language,
                    'date_locale' => $language['code'],
                    'is_active' => true,
                    'is_system' => true,
                    'translations' => is_array($translations) ? $translations : [],
                ],
            );
        }
    }
}
