<?php

namespace Database\Seeders;

use App\Models\Central\WebsiteContentItem;
use App\Models\Central\WebsiteMenu;
use App\Models\Central\WebsitePage;
use App\Models\Central\WebsiteSection;
use App\Models\Central\ContactLocation;
use App\Models\Central\Media;
use App\Models\Central\NavbarNotification;
use App\Models\Central\ResourceArticle;
use App\Models\Central\ResourceCategory;
use App\Models\Central\WebsiteFeature;
use App\Models\Central\WebsiteSocialLink;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class WebsiteSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            'home' => ['Home', 'home', 'One intelligent workspace for finance and operations.'],
            'features' => ['Features', 'features', 'Explore connected tools for accounting, sales, inventory, CRM, people, and reporting.'],
            'pricing' => ['Pricing', 'pricing', 'Straightforward plans built to grow with your business.'],
            'contact' => ['Talk to our team', 'contact', 'Tell us how your business works and we will help map the right setup.'],
            'blog' => ['Blogs', 'blog', 'Practical ideas for running a clearer, more connected business.'],
            'resources' => ['Resources', 'resources', 'Illustrated guides for setting up and using KiteLedger.'],
            'privacy-policy' => ['Privacy Policy', 'legal', 'How KiteLedger handles and protects personal information.'],
            'terms-of-service' => ['Terms of Service', 'legal', 'The terms governing access to and use of KiteLedger.'],
            'cookie-policy' => ['Cookie Policy', 'legal', 'How and why KiteLedger uses cookies and similar technologies.'],
        ];

        foreach ($pages as $slug => [$title, $type, $excerpt]) {
            WebsitePage::updateOrCreate(['slug' => $slug], [
                'title' => $title, 'page_type' => $type, 'excerpt' => $excerpt,
                'body' => $type === 'legal' ? '<h2>Our commitment</h2><p>This page provides a clear summary of the policies that apply when you use KiteLedger. Your organization should review and adapt this seeded policy with qualified counsel before publishing it.</p><h2>Questions</h2><p>Contact the platform operator if you have questions about this policy or your data.</p>' : null,
                'layout' => $type === 'legal' ? 'legal' : 'landing', 'status' => 'published',
                'visibility' => 'public', 'published_at' => now(), 'robots_index' => true,
                'robots_follow' => true, 'sitemap_include' => true, 'sitemap_priority' => $slug === 'home' ? .9 : .6,
                'sitemap_change_frequency' => in_array($type, ['home', 'blog'], true) ? 'weekly' : 'monthly',
                'meta_title' => ($slug === 'home' ? 'KiteLedger — Run your business from one workspace' : $title.' | KiteLedger'),
                'meta_description' => $excerpt,
            ]);
        }
        WebsitePage::whereIn('slug', ['about', 'support'])->update(['status' => 'archived']);

        $home = WebsitePage::where('slug', 'home')->firstOrFail();
        $sections = [
            ['hero', 'hero', 'A clearer way to run your business', 'Run your entire business from one intelligent workspace.', 'Connect accounting, invoicing, inventory, CRM, HR, reporting, and daily operations in one powerful platform built for growing companies.', 'Start free', '/pricing', 'Explore the platform', '/features', [], null],
            ['trusted', 'logos', null, 'Trusted by teams that value clarity', null, null, null, null, null, [], null],
            ['platform', 'features', 'One connected platform', 'Everything your team needs. Nothing your data has to fight.', 'Replace disconnected tools and fragile spreadsheets with workflows that share the same source of truth.', null, null, null, null, [
                ['title' => 'Financial control', 'content' => 'General ledger, journal entries, receivables, payables, tax, and close-ready reports.', 'icon' => 'chart'],
                ['title' => 'Sales and invoicing', 'content' => 'From estimate to payment with clear ownership and a complete customer history.', 'icon' => 'spark'],
                ['title' => 'Inventory and purchasing', 'content' => 'Know what is in stock, what is moving, and what needs to be replenished.', 'icon' => 'box'],
                ['title' => 'CRM and customers', 'content' => 'Bring conversations, opportunities, orders, and balances into one useful view.', 'icon' => 'people'],
                ['title' => 'People operations', 'content' => 'Manage employee records, attendance, leave, payroll, and everyday HR workflows.', 'icon' => 'people'],
                ['title' => 'Governance and security', 'content' => 'Roles, approvals, audit history, and isolated customer workspaces protect critical work.', 'icon' => 'shield'],
            ], null],
            ['invoice', 'product', 'Move from work to cash', 'Create polished invoices. Get paid with less follow-up.', 'Build estimates, convert them into invoices, record payments, and understand what is outstanding without stitching reports together.', 'Explore invoicing', '/features', null, null, [
                ['title' => 'Flexible document numbering', 'content' => 'Consistent sequences across branches and document types.'],
                ['title' => 'Live payment status', 'content' => 'See paid, partial, overdue, and outstanding balances instantly.'],
                ['title' => 'Customer context', 'content' => 'Keep transactions, contacts, and communication connected.'],
            ], 'mist'],
            ['operations', 'features', 'Operations, in context', 'Make faster decisions with the whole picture in view.', 'Each workspace connects daily activity to the financial result, so teams spend less time reconciling and more time improving.', null, null, null, null, [
                ['title' => 'Multi-branch command center', 'content' => 'Compare performance while preserving clear branch-level responsibility.', 'icon' => 'chart'],
                ['title' => 'Warehouse visibility', 'content' => 'Track stock movement, transfers, batches, and reorder pressure.', 'icon' => 'box'],
                ['title' => 'Approvals that keep moving', 'content' => 'Route purchases, expenses, and sensitive actions to the right people.', 'icon' => 'shield'],
            ], null],
            ['metrics', 'statistics', null, 'Built for confident daily operations', 'Useful scale, dependable controls, and a workspace your team can understand.', null, null, null, null, [
                ['value' => '360°', 'content' => 'Business visibility'], ['value' => '20+', 'content' => 'Connected modules'], ['value' => '24/7', 'content' => 'Operational access'], ['value' => '1', 'content' => 'Source of truth'],
            ], null],
            ['security', 'security', 'Trust is a product feature', 'Control access without slowing good work down.', 'KiteLedger is designed around clear boundaries, traceable actions, and practical safeguards for sensitive business information.', 'Explore security', '/features', null, null, [
                ['title' => 'Role-based access', 'content' => 'Give people only the capabilities their work requires.'],
                ['title' => 'Audit-ready activity', 'content' => 'Understand who changed what, and when.'],
                ['title' => 'Customer isolation', 'content' => 'Dedicated data boundaries keep customer workspaces separate.'],
            ], 'dark'],
            ['testimonials', 'testimonials', 'From the people doing the work', 'A calmer operating rhythm for every team.', null, null, null, null, null, [], null],
            ['pricing', 'pricing', 'Simple, flexible pricing', 'Start with what fits. Grow without starting over.', 'Every plan keeps the same connected KiteLedger foundation.', null, null, null, null, [], 'mist'],
            ['faq', 'faq', 'Questions, answered', 'Everything you need to know before getting started.', null, null, null, null, null, [], null],
            ['final', 'cta', 'Your next clear decision starts here', 'Bring finance, operations, customers, inventory, and people together.', 'See how KiteLedger can fit the way your company actually works.', 'Start free', '/pricing', 'Talk to our team', '/contact', [], null],
        ];

        foreach ($sections as $order => [$key, $type, $eyebrow, $title, $subtitle, $button, $url, $secondary, $secondaryUrl, $items, $background]) {
            WebsiteSection::updateOrCreate(['page_id' => $home->id, 'section_key' => $key], [
                'section_type' => $type, 'eyebrow' => $eyebrow, 'title' => $title, 'subtitle' => $subtitle,
                'button_text' => $button, 'button_url' => $url, 'secondary_button_text' => $secondary,
                'secondary_button_url' => $secondaryUrl, 'items' => $items, 'background_style' => $background,
                'alignment' => 'left', 'is_active' => true, 'sort_order' => $order,
            ]);
        }

        WebsiteMenu::where('location', 'header')->update(['is_active' => false]);
        $menuSets = [
            'header' => ['Home' => '/', 'Features' => '/features', 'Pricing' => '/pricing', 'Blogs' => '/blog', 'Resources' => '/resources', 'Contact' => '/contact'],
            'product' => ['Accounting' => '/features', 'Invoicing' => '/features', 'Inventory' => '/features', 'CRM' => '/features'],
            'resources' => ['Blogs' => '/blog', 'Documentation' => '/resources', 'Contact' => '/contact'],
            'footer' => ['Home' => '/', 'Features' => '/features', 'Contact' => '/contact', 'Pricing' => '/pricing'],
            'legal' => ['Privacy' => '/privacy-policy', 'Terms' => '/terms-of-service', 'Cookies' => '/cookie-policy'],
        ];
        foreach ($menuSets as $location => $items) {
            foreach ($items as $order => $url) {
                $page = str_contains($url, '#') ? null : WebsitePage::where('slug', trim($url, '/'))->first();
                WebsiteMenu::updateOrCreate(['location' => $location, 'label' => $order], [
                    'url' => $url, 'page_id' => $page?->id, 'target' => 'same_tab', 'is_active' => true,
                    'sort_order' => array_search($order, array_keys($items), true),
                ]);
            }
        }

        $this->seedContent();
        $this->seedStructuredContent();
    }

    private function seedContent(): void
    {
        $content = [
            'announcement' => [
                'multi-branch-insights' => ['New: Multi-branch reporting and intelligent cash-flow insights are now available.', ['link_label' => 'See what is new', 'url' => '/features', 'dismissible' => true, 'style' => 'green']],
            ],
            'logo' => [
                'northstar' => ['Northstar', []], 'atlas' => ['ATLAS', []], 'meridian' => ['Meridian Works', []], 'grove' => ['Grove & Co.', []], 'summit' => ['SUMMIT', []],
            ],
            'testimonial' => [
                'maya-chen' => ['The month-end picture used to live across five tools. Now our team works from the same numbers every day.', ['attribution' => 'Maya Chen', 'role' => 'Finance Director', 'company' => 'Northstar Creative', 'rating' => 5]],
                'arjun-shah' => ['KiteLedger gives branch managers autonomy while keeping controls and reporting consistent at head office.', ['attribution' => 'Arjun Shah', 'role' => 'COO', 'company' => 'Atlas Retail Group', 'rating' => 5]],
                'sara-williams' => ['We can follow a customer from first conversation through invoice and payment without losing the story.', ['attribution' => 'Sara Williams', 'role' => 'Commercial Lead', 'company' => 'Meridian Works', 'rating' => 5]],
            ],
            'faq' => [
                'getting-started' => ['How quickly can we get started?', 'A platform administrator provisions your secure workspace, then your team can configure company settings, roles, opening data, and workflows.'],
                'modules' => ['Do we need to use every module?', 'No. Enable the capabilities your organization needs today and expand the workspace as your processes grow.'],
                'data-isolation' => ['How is customer data isolated?', 'Each customer uses dedicated data boundaries together with customer-aware application access controls.'],
                'migration' => ['Can we bring data from our current tools?', 'KiteLedger supports structured imports and a guided setup process. The exact migration path depends on your source systems and plan.'],
                'branches' => ['Does KiteLedger support multiple branches?', 'Yes. Eligible plans support branch-aware transactions, permissions, stock, reporting, and operating workflows.'],
                'security' => ['Does KiteLedger provide audit logs?', 'Yes. Administrators can review traceable activity and control access with roles and permissions.'],
                'plans' => ['Can we change our plan later?', 'Yes. Plan availability and subscription changes follow the billing options configured by your platform operator.'],
                'support' => ['What support is available?', 'Tenant users can use the support portal, while public help and contact options can be managed by the platform team.'],
            ],
        ];

        foreach ($content as $type => $items) {
            foreach ($items as $order => $payload) {
                [$title, $data] = $payload;
                $isFaq = $type === 'faq';
                WebsiteContentItem::updateOrCreate(['type' => $type, 'slug' => $order], [
                    'title' => $isFaq ? $title : ($data['attribution'] ?? ucfirst(str_replace('-', ' ', $order))),
                    'content' => $isFaq ? $data : $title, 'data' => $isFaq ? [] : $data,
                    'status' => 'published', 'published_at' => now(),
                    'sort_order' => array_search($order, array_keys($items), true),
                ]);
            }
        }
    }

    private function seedStructuredContent(): void
    {
        $media = null;
        $source = base_path('docs/screenshots/kiteledger-home-desktop.png');
        if (is_file($source)) {
            $path = 'website/seed/kiteledger-home-desktop.png';
            if (! Storage::disk('public')->exists($path)) Storage::disk('public')->put($path, file_get_contents($source));
            [$width, $height] = getimagesize($source) ?: [null, null];
            $media = Media::updateOrCreate(['path' => $path], ['disk'=>'public','original_filename'=>'kiteledger-home-desktop.png','mime_type'=>'image/png','size'=>filesize($source),'width'=>$width,'height'=>$height,'title'=>'KiteLedger dashboard','alt_text'=>'KiteLedger business dashboard overview']);
        }
        foreach ([
            ['Connected accounting','connected-accounting','Keep journals, receivables, payables, tax, and financial reports in one dependable flow.'],
            ['Inventory visibility','inventory-visibility','Understand stock, purchasing, warehouses, and movement without disconnected spreadsheets.'],
            ['Customer relationships','customer-relationships','Connect conversations, opportunities, invoices, payments, and support history.'],
        ] as $order => [$title,$slug,$excerpt]) WebsiteFeature::updateOrCreate(['slug'=>$slug], ['title'=>$title,'excerpt'=>$excerpt,'body'=>'<p>'.$excerpt.'</p>','featured_media_id'=>$media?->id,'status'=>'published','published_at'=>now(),'sort_order'=>$order,'seo_title'=>$title.' | KiteLedger','meta_description'=>$excerpt]);

        $category = ResourceCategory::updateOrCreate(['slug'=>'getting-started'], ['name'=>'Getting Started','description'=>'Short guides for configuring a new KiteLedger workspace.','status'=>'active','sort_order'=>0]);
        foreach ([
            ['Set up your company','set-up-your-company','Configure company identity, currency, dates, and branding.','Open Settings, review the company profile, choose your working currency and timezone, then upload the light and dark logo variants.'],
            ['Invite your team','invite-your-team','Add users and give each person a clear role.','Create users from the administration area, assign the smallest practical role, and verify access before sharing credentials.'],
            ['Create your first invoice','create-your-first-invoice','Move from customer details to a polished invoice.','Add the customer, create an invoice with clear line items and due dates, then record or collect payment from the invoice workflow.'],
        ] as $order => [$title,$slug,$excerpt,$body]) ResourceArticle::updateOrCreate(['slug'=>$slug], ['category_id'=>$category->id,'title'=>$title,'excerpt'=>$excerpt,'body'=>'<h2>'.$title.'</h2><p>'.$body.'</p>','featured_media_id'=>$media?->id,'gallery_media_ids'=>$media?->id?[$media->id]:[],'status'=>'published','published_at'=>now(),'sort_order'=>$order,'seo_title'=>$title.' | KiteLedger Resources','meta_description'=>$excerpt]);

        ContactLocation::firstOrCreate(['name'=>'Main Office'], ['address'=>'Update this address in Website → Contact Locations','email'=>'hello@example.com','business_hours'=>'Monday–Friday, 9:00–17:00','is_active'=>true,'sort_order'=>0]);
        foreach ([['LinkedIn','https://www.linkedin.com/'],['Facebook','https://www.facebook.com/'],['Instagram','https://www.instagram.com/']] as $order => [$platform,$url]) WebsiteSocialLink::firstOrCreate(['platform'=>$platform], ['url'=>$url,'icon'=>$platform,'is_active'=>false,'sort_order'=>$order]);
        NavbarNotification::firstOrCreate(['content'=>'Welcome to KiteLedger—one connected workspace for your business.'], ['link_label'=>'Explore features','link_url'=>'/features','target'=>'same_tab','is_dismissible'=>true,'is_active'=>false,'sort_order'=>0]);
    }
}
