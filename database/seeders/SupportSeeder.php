<?php

namespace Database\Seeders;

use App\Models\Central\SupportCategory;
use App\Models\Central\SupportSavedReply;
use Illuminate\Database\Seeder;

class SupportSeeder extends Seeder
{
    public function run(): void
    {
        $categories = collect([
            ['Account and Access', 'account-access', 'normal'], ['Billing and Subscription', 'billing-subscription', 'normal'],
            ['Technical Issue', 'technical-issue', 'high'], ['Data and Import', 'data-import', 'normal'],
            ['Feature Request', 'feature-request', 'low'], ['Other', 'other', 'normal'],
        ])->mapWithKeys(function ($row, int $order): array {
            $category = SupportCategory::firstOrCreate(['slug' => $row[1]], ['name' => $row[0], 'default_priority' => $row[2], 'is_active' => true, 'sort_order' => $order]);

            return [$row[1] => $category];
        });
        foreach ([
            'Request more information' => 'Thanks for contacting us. Please share the steps you followed, the result you expected, and any relevant screenshot without sensitive data.',
            'Issue under investigation' => 'We have enough information to investigate and will update this ticket when we know more.',
            'Billing clarification' => 'We are reviewing the invoice and payment context and will follow up with a clear explanation.',
            'Resolution confirmation' => 'The reported issue has been addressed. Please confirm that the workflow now behaves as expected.',
            'Closing inactive ticket' => 'We have not received a response, so this ticket will be closed. You can reopen it within the configured reopen period.',
        ] as $title => $body) {
            SupportSavedReply::firstOrCreate(['title' => $title], ['body' => $body, 'is_active' => true]);
        }
    }
}
