<?php

namespace Database\Seeders;

use App\Models\Central\WebsiteContentItem;
use App\Models\Central\WebsiteMenu;
use App\Models\Central\WebsitePage;
use App\Models\Central\WebsiteSection;
use Illuminate\Database\Seeder;

class WebsiteSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            'home' => ['Home', 'home'], 'features' => ['Features', 'features'], 'pricing' => ['Pricing', 'pricing'],
            'about' => ['About', 'about'], 'contact' => ['Contact', 'contact'], 'blog' => ['Blog', 'blog'],
            'support' => ['Support', 'support'], 'privacy-policy' => ['Privacy Policy', 'legal'],
            'terms-of-service' => ['Terms of Service', 'legal'], 'cookie-policy' => ['Cookie Policy', 'legal'],
        ];
        foreach ($pages as $slug => [$title, $type]) {
            WebsitePage::firstOrCreate(['slug' => $slug], [
                'title' => $title, 'page_type' => $type, 'excerpt' => $title.' information for KiteLedger customers.',
                'status' => 'published', 'visibility' => 'public', 'published_at' => now(),
                'meta_title' => $title.' | KiteLedger', 'meta_description' => 'Learn about '.strtolower($title).' in KiteLedger.',
            ]);
        }

        $home = WebsitePage::where('slug', 'home')->firstOrFail();
        $sections = [
            'hero' => ['Hero', 'Run your business with financial clarity', 'Accounting, billing, inventory, CRM, and operations in one secure workspace.'],
            'accounting' => ['Feature', 'Accounting overview', 'Keep ledgers, journals, and reporting connected.'],
            'invoicing' => ['Feature', 'Invoicing', 'Create consistent invoices and follow payment status.'],
            'expenses' => ['Feature', 'Expense management', 'Record, categorize, and review business spending.'],
            'inventory' => ['Feature', 'Inventory', 'Understand stock movement across products and warehouses.'],
            'crm' => ['Feature', 'CRM', 'Keep customer context close to commercial activity.'],
            'reporting' => ['Feature', 'Reporting', 'Turn operational records into useful business views.'],
            'multi_branch' => ['Feature', 'Multi-branch', 'Operate multiple locations with clear boundaries.'],
            'ai' => ['Feature', 'AI capabilities', 'Use assisted workflows with explicit controls and auditability.'],
            'security' => ['Trust', 'Designed for responsible operations', 'Permissions, audit trails, MFA, and tenant isolation protect sensitive work.'],
            'integrations' => ['Feature', 'Integrations', 'Connect payment and operational services through supported drivers.'],
            'pricing_cta' => ['CTA', 'Choose the plan that fits', 'Start with the essentials and expand as your needs grow.'],
            'testimonials' => ['Testimonials', 'Built around practical workflows', 'A flexible foundation for teams that value clear financial operations.'],
            'faqs' => ['FAQ', 'Frequently asked questions', 'Answers to common questions about KiteLedger.'],
            'final_cta' => ['CTA', 'Bring your operations together', 'Create a workspace and configure it for your organization.'],
            'footer' => ['Footer', 'KiteLedger', 'Business operations with clarity and control.'],
        ];
        foreach ($sections as $order => $data) {
            [$key, [$type, $title, $content]] = [$order, $data];
            WebsiteSection::firstOrCreate(['page_id' => $home->id, 'section_key' => $key], [
                'section_type' => strtolower($type), 'title' => $title, 'content' => $content,
                'is_active' => true, 'sort_order' => array_search($key, array_keys($sections), true),
            ]);
        }

        $menuSets = [
            'header' => ['Features' => '/features', 'Pricing' => '/pricing', 'Blog' => '/blog', 'Support' => '/support'],
            'footer' => ['About' => '/about', 'Contact' => '/contact', 'Support' => '/support'],
            'legal' => ['Privacy Policy' => '/privacy-policy', 'Terms of Service' => '/terms-of-service', 'Cookie Policy' => '/cookie-policy'],
        ];
        foreach ($menuSets as $location => $items) {
            foreach ($items as $order => $url) {
                $page = WebsitePage::where('slug', trim($url, '/'))->first();
                WebsiteMenu::firstOrCreate(['location' => $location, 'label' => $order], [
                    'url' => $url, 'page_id' => $page?->id, 'target' => 'same_tab', 'is_active' => true,
                    'sort_order' => array_search($order, array_keys($items), true),
                ]);
            }
        }

        foreach ([
            'getting-started' => ['How do I get started?', 'An administrator creates and provisions your workspace, then invites the owner.'],
            'data-isolation' => ['How is tenant data isolated?', 'Each tenant uses a dedicated database and tenant-aware access controls.'],
            'plans' => ['Can I change plans?', 'Plan changes are available according to the subscription settings configured by the platform administrator.'],
            'payments' => ['Which payment methods are supported?', 'Available methods depend on the payment gateways enabled for your account.'],
            'support' => ['How do I contact support?', 'Signed-in tenant users can open a ticket from the support portal.'],
            'exports' => ['Can I export my data?', 'Export capabilities depend on the modules and permissions enabled for your workspace.'],
            'security' => ['Does KiteLedger support MFA?', 'Administrators can require multi-factor authentication for sensitive access.'],
            'custom-domain' => ['Can I use a custom domain?', 'Custom domains can be enabled per plan and verified before activation.'],
        ] as $slug => [$title, $content]) {
            WebsiteContentItem::firstOrCreate(['type' => 'faq', 'slug' => $slug], ['title' => $title, 'content' => $content, 'status' => 'published', 'published_at' => now()]);
        }
        foreach (['finance-lead' => ['Finance lead', 'The connected workflow helps our team keep routine reviews organized.'], 'operations-manager' => ['Operations manager', 'Clear roles and a shared operational view make handoffs easier.'], 'business-owner' => ['Business owner', 'The platform gives us one place to understand day-to-day business activity.']] as $slug => [$title, $content]) {
            WebsiteContentItem::firstOrCreate(['type' => 'testimonial', 'slug' => $slug], ['title' => $title, 'content' => $content, 'status' => 'published', 'published_at' => now()]);
        }
    }
}
