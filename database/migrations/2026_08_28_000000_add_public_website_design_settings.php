<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('platform_settings')) {
            return;
        }

        $definitions = [
            ['design_preset', 'Design preset', 'kiteledger-default', ['kiteledger-default', 'minimal', 'corporate', 'fintech', 'dark']],
            ['typography_scale', 'Typography scale', 'standard', ['compact', 'standard', 'large']],
            ['layout_density', 'Layout density', 'standard', ['compact', 'standard', 'spacious']],
            ['corner_style', 'Corner style', 'soft', ['square', 'soft', 'rounded']],
            ['card_style', 'Card style', 'bordered', ['flat', 'bordered', 'soft-shadow', 'elevated']],
            ['button_style', 'Button style', 'soft', ['square', 'soft', 'rounded', 'pill']],
            ['heading_font', 'Heading font', 'Manrope', null], ['body_font', 'Body font', 'Manrope', null],
            ['primary_color', 'Primary color', '#176b5b', null], ['secondary_color', 'Secondary color', '#10211d', null],
            ['accent_color', 'Accent color', '#d97706', null], ['background_color', 'Background color', '#fbfcfb', null],
            ['surface_color', 'Surface color', '#f2f6f4', null], ['heading_color', 'Heading color', '#14231f', null],
            ['text_color', 'Text color', '#3d4d48', null], ['muted_color', 'Muted color', '#687772', null],
            ['border_color', 'Border color', '#dce4e1', null], ['footer_background', 'Footer background', '#10211d', null],
        ];

        foreach ($definitions as $order => [$key, $label, $default, $options]) {
            DB::table('platform_settings')->insertOrIgnore([
                'group' => 'design', 'key' => 'design.'.$key, 'label' => $label,
                'description' => 'Public website design control', 'input_type' => $options ? 'select' : (str_ends_with($key, '_font') ? 'text' : 'color'),
                'type' => 'string', 'options' => $options ? json_encode($options) : null,
                'default_value' => $default, 'value' => $default, 'is_public' => true,
                'sort_order' => $order, 'environment' => 'all', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        if (DB::getSchemaBuilder()->hasTable('platform_settings')) {
            DB::table('platform_settings')->where('group', 'design')->delete();
        }
    }
};
