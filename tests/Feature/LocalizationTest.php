<?php

namespace Tests\Feature;

use App\Models\Language;
use App\Models\Role;
use App\Models\User;
use App\Services\LocalizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_localization_service_exposes_seeded_languages_and_fallback_keys(): void
    {
        $localization = app(LocalizationService::class);

        $this->assertContains('en', $localization->supportedCodes());
        $this->assertContains('ne', $localization->supportedCodes());
        $this->assertContains('ar', $localization->supportedCodes());
        $this->assertSame('Dashboard', $localization->translationsFor('en')['Dashboard']);
        $this->assertSame('rtl', $localization->direction('ar'));
    }

    public function test_translation_editor_loads_the_language_pack_and_reports_real_progress(): void
    {
        $role = Role::query()->create([
            'name' => 'Full Access Admin',
            'guard_name' => 'web',
            'active' => true,
        ]);
        $user = User::factory()->create(['role_id' => $role->id]);
        $language = Language::query()->where('code', 'ne')->firstOrFail();

        $response = $this->actingAs($user)->getJson(
            route('localization.translations.index', ['language' => $language]),
        )->assertOk();

        $dashboard = collect($response->json('rows'))->firstWhere('key', 'Dashboard');

        $this->assertSame('ड्यासबोर्ड', $dashboard['value']);
        $this->assertFalse($dashboard['missing']);
        $this->assertGreaterThan(0, $response->json('translated'));
    }

    public function test_authenticated_user_can_persist_any_active_language_preference(): void
    {
        $user = User::factory()->create();
        Language::query()->create([
            'code' => 'fr',
            'name' => 'French',
            'native_name' => 'Français',
            'direction' => 'ltr',
            'is_active' => true,
            'is_default' => false,
            'sort_order' => 50,
            'translations' => ['Dashboard' => 'Tableau de bord'],
        ]);

        app(LocalizationService::class)->clearCache();

        $this->actingAs($user)
            ->from('/dashboard')
            ->post(route('locale.change'), [
                'locale' => 'fr',
                'persist' => true,
            ])
            ->assertRedirect('/dashboard')
            ->assertSessionHas('locale', 'fr');

        $this->assertSame('fr', $user->fresh()->locale);
    }

    public function test_admin_can_add_language_and_save_translation_overrides(): void
    {
        $role = Role::query()->create([
            'name' => 'Full Access Admin',
            'guard_name' => 'web',
            'active' => true,
        ]);
        $user = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($user)->postJson(
            route('localization.languages.store'),
            [
                'code' => 'fr',
                'name' => 'French',
                'native_name' => 'Français',
                'direction' => 'ltr',
                'is_active' => true,
            ],
        )->assertCreated();

        $languageId = $response->json('id');

        $this->putJson(
            route('localization.translations.update', ['language' => $languageId]),
            [
                'translations' => [
                    'Dashboard' => 'Tableau de bord',
                    'Save' => 'Enregistrer',
                ],
            ],
        )->assertOk();

        $this->assertSame(
            'Tableau de bord',
            Language::query()->findOrFail($languageId)->translations['Dashboard'],
        );
    }

    public function test_inactive_language_cannot_be_selected(): void
    {
        $user = User::factory()->create();
        Language::query()->create([
            'code' => 'de',
            'name' => 'German',
            'native_name' => 'Deutsch',
            'direction' => 'ltr',
            'is_active' => false,
            'is_default' => false,
            'sort_order' => 60,
        ]);

        app(LocalizationService::class)->clearCache();

        $this->actingAs($user)
            ->post(route('locale.change'), ['locale' => 'de'])
            ->assertSessionHasErrors('locale');
    }
}
