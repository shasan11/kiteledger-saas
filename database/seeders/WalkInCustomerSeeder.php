<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Services\AccountProvisioningService;
use Illuminate\Database\Seeder;

/**
 * Seeds the single "Walk-in Customer" contact used by POS / counter sales.
 *
 * This is essential setup data (not demo data): every install needs a default
 * walk-in customer so POS works out of the box. Fully idempotent — keyed on the
 * WALK-IN code, so running it repeatedly never creates duplicates. It is the
 * single source of truth, reused by both DatabaseSeeder (normal install) and
 * PosSeeder (demo install).
 *
 * Requires the chart of accounts to be seeded first (for receivable account
 * provisioning).
 */
class WalkInCustomerSeeder extends Seeder
{
    public const CODE = 'WALK-IN';

    public function run(): void
    {
        $walkIn = Contact::updateOrCreate(
            ['code' => self::CODE],
            [
                'contact_type' => 'customer',
                'name' => 'Walk-in Customer',
                'phone' => null,
                'email' => null,
                'accept_purchase' => false,
                'credit_limit' => 0,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        // Link to a receivable account so POS sales can post to accounting.
        // Only provisions once — skipped on re-seed when the account exists.
        if (! $walkIn->account_id) {
            app(AccountProvisioningService::class)->createForContact($walkIn->fresh());
        }
    }
}
