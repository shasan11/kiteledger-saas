<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicStorageRouteTest extends TestCase
{
    public function test_public_storage_files_are_served_without_storage_symlink(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('company/logos/logo.txt', 'kiteledger-logo');

        $response = $this->get('/storage/company/logos/logo.txt');

        $response->assertOk();
        $this->assertSame('kiteledger-logo', $response->streamedContent());
    }
}
