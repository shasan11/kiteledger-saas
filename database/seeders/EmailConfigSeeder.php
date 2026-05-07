<?php

namespace Database\Seeders;

use App\Models\EmailConfig;
use Illuminate\Database\Seeder;

class EmailConfigSeeder extends Seeder
{
    public function run(): void
    {
        EmailConfig::query()->updateOrCreate(
            ['email_config_name' => 'Default SMTP'],
            [
                'branch_id' => null,
                'mailer' => 'smtp',
                'email_host' => 'smtp.mailtrap.io',
                'email_port' => 587,
                'encryption' => 'tls',
                'email_user' => 'smtp-user',
                'email_pass' => 'change-me',
                'from_name' => 'KiteLedger',
                'from_address' => 'no-reply@kiteledger.local',
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => null,
            ]
        );
    }
}
