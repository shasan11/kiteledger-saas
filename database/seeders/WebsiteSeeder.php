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

class WebsiteSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            'home' => ['Home', 'home', 'Accounting software that keeps your ledger, invoicing, and reporting in one place.'],
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
                'meta_title' => ($slug === 'home' ? 'KiteLedger | Accounting and finance software for growing businesses' : $title.' | KiteLedger'),
                'meta_description' => $excerpt,
            ]);
        }
        WebsitePage::whereIn('slug', ['about', 'support'])->update(['status' => 'archived']);

        $home = WebsitePage::where('slug', 'home')->firstOrFail();
        $sections = [
            ['hero', 'hero', 'Accounting and finance software', 'Your books, closed on time. Every month.', 'General ledger, invoicing, receivables, payables, tax, and reporting in one connected system — with the operational detail behind every number.', 'Start free', '/pricing', 'Explore the platform', '/features', [
                ['title' => 'Set up in minutes'], ['title' => 'Built for growing teams'], ['title' => 'Secure cloud workspace'],
            ], null],
            ['trusted', 'logos', null, 'Trusted by finance teams that value clarity', null, null, null, null, null, [], null],
            ['platform', 'features', 'Built around the ledger', 'Everything the finance function actually runs on.', 'Double-entry accounting at the core, with the day-to-day workflows that feed it already connected.', null, null, null, null, [
                ['title' => 'General ledger and journals', 'content' => 'Double-entry postings, journal vouchers, opening balances, and a chart of accounts you control.', 'icon' => 'chart'],
                ['title' => 'Invoicing and receivables', 'content' => 'Estimates through to payment, with ageing and outstanding balances always current.', 'icon' => 'invoice'],
                ['title' => 'Payables and expenses', 'content' => 'Bills, purchase invoices, and expense claims tracked against the right supplier and account.', 'icon' => 'workflow'],
                ['title' => 'Tax and compliance', 'content' => 'Tax rates and groups applied at the transaction, so returns and filings reconcile.', 'icon' => 'shield'],
                ['title' => 'Financial reporting', 'content' => 'Trial balance, P&L, balance sheet, cash flow, and ledgers ready whenever you are.', 'icon' => 'layers'],
                ['title' => 'Multi-branch and multi-currency', 'content' => 'Branch-level books and foreign-currency transactions that consolidate cleanly.', 'icon' => 'box'],
            ], null],
            ['showcase', 'features_mini', 'Inside the product', 'The screens your finance team works in every day', 'Every figure traces back to the transaction that produced it.', 'Explore the platform', '/features', null, null, [
                ['title' => 'Financial dashboard', 'content' => 'Revenue, expenses, profit, and cash for any branch and date range.', 'icon' => 'chart'],
                ['title' => 'Invoicing', 'content' => 'Every invoice with its customer, approval state, and payment history.', 'icon' => 'invoice'],
                ['title' => 'Reports', 'content' => 'Sixty-three built-in reports across accounting, sales, tax, and stock.', 'icon' => 'box'],
                ['title' => 'General ledger', 'content' => 'Drill from any balance down to the journal line behind it.', 'icon' => 'layers'],
                ['title' => 'Bank and reconciliation', 'content' => 'Match statement lines, clear differences, and finalise the period.', 'icon' => 'check'],
                ['title' => 'Documents', 'content' => 'Upload a bill and track it from scan to posted transaction.', 'icon' => 'workflow'],
                ['title' => 'Tax settings', 'content' => 'Rates, groups, and treatments applied consistently across documents.', 'icon' => 'shield'],
                ['title' => 'Approvals', 'content' => 'Credit limits, stock, and pricing rules checked before anything posts.', 'icon' => 'clock'],
            ], 'mist'],
            ['invoice', 'product', 'Receivables', 'Invoice, collect, and reconcile without the chase.', 'Raise estimates, convert them to invoices, record payments against the ledger, and see what is outstanding without exporting anything.', 'Explore invoicing', '/features', null, null, [
                ['title' => 'Flexible document numbering', 'content' => 'Consistent sequences across branches and document types.'],
                ['title' => 'Live receivables position', 'content' => 'Paid, partial, overdue, and ageing balances always current.'],
                ['title' => 'Posted on approval', 'content' => 'Every invoice and receipt lands in the ledger with its full audit trail.'],
            ], 'mist'],
            ['operations', 'features', 'Where the numbers come from', 'The operations behind every posting.', 'Stock, sales, and payroll are part of the same system, so the ledger reflects what actually happened instead of what was re-keyed.', null, null, null, null, [
                ['title' => 'Inventory and stock valuation', 'content' => 'Movements, transfers, and batches post straight to inventory and cost of sales.', 'icon' => 'box'],
                ['title' => 'Sales and point of sale', 'content' => 'Counter sales and receipts reach revenue and cash without an overnight import.', 'icon' => 'spark'],
                ['title' => 'Payroll and people costs', 'content' => 'Employee records, attendance, and payroll land against the right expense accounts.', 'icon' => 'people'],
            ], null],
            ['metrics', 'statistics', null, 'Books you can defend', 'Traceable postings, dependable controls, and reporting your accountant will recognise.', null, null, null, null, [
                ['value' => '63', 'content' => 'Built-in financial reports'], ['value' => 'Double-entry', 'content' => 'At the core of every module'], ['value' => 'Multi-currency', 'content' => 'With forex revaluation'], ['value' => 'Full', 'content' => 'Audit trail on every posting'],
            ], null],
            ['ai', 'ai', 'AI built into the workflow', 'Your AI copilot for everyday accounting.', 'Ask questions in plain language, let KiteLedger draft the work from your own data, and approve what you trust. Every suggestion stays auditable.', 'Explore AI features', '/features', null, null, [
                ['title' => 'Ask your data anything', 'content' => 'Question balances, ageing, stock, or sales in plain language and get answers from your live workspace.'],
                ['title' => 'Documents that read themselves', 'content' => 'Upload a bill or receipt and AI extracts it, matches the customer and products, and prepares a draft.'],
                ['title' => 'Proposals, never surprises', 'content' => 'The copilot proposes an action; a person approves it. Nothing posts to your ledger unreviewed.'],
            ], 'dark'],
            ['testimonials', 'testimonials', 'From the finance teams using it', 'A calmer close, month after month.', null, null, null, null, null, [], null],
            ['pricing', 'pricing', 'Simple, flexible pricing', 'Start with what fits. Grow without starting over.', 'Every plan keeps the same double-entry accounting foundation.', null, null, null, null, [], null],
            ['faq', 'faq', 'Questions, answered', 'Everything you need to know before moving your books.', null, null, null, null, null, [], 'mist'],
            ['final', 'cta', 'Your next close starts here', 'Put your accounting on a foundation you can trust.', 'See how KiteLedger handles your ledger, invoicing, tax, and reporting.', 'Start free', '/pricing', 'Talk to our team', '/contact', [], null],
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

        $featureMedia = $this->seedFeatureMedia();
        $this->seedStructuredContent($featureMedia);
        $this->attachHomeSectionMedia($home, $featureMedia);
    }

    /**
     * Attaches packaged screenshots to the homepage.
     *
     * Deliberately narrow: only the hero carries a product screenshot. The
     * remaining homepage sections use text and icon-led layouts.
     *
     * @param array<string, Media> $featureMedia
     */
    private function attachHomeSectionMedia(WebsitePage $home, array $featureMedia): void
    {
        $section = fn (string $key): ?WebsiteSection => WebsiteSection::where('page_id', $home->id)
            ->where('section_key', $key)->first();

        foreach (['hero' => 'homedashboard'] as $key => $stem) {
            if (! ($target = $section($key)) || ! isset($featureMedia[$stem])) {
                continue;
            }
            // Saved through the model so the casts and page-cache hook both run.
            $target->update(['media_id' => $featureMedia[$stem]->id, 'image' => $featureMedia[$stem]->url, 'settings' => ['layout' => 'centered']]);
        }

        // The section loop above rewrites items but not image/media_id/settings,
        // so art attached by an earlier seed run has to be cleared explicitly or
        // it survives forever. Settings are then re-applied below.
        foreach (['platform', 'operations', 'ai', 'final', 'showcase', 'invoice'] as $key) {
            $section($key)?->update(['media_id' => null, 'image' => null, 'settings' => null]);
        }

        // Consecutive feature sections pick different layouts on purpose: three
        // identical card walls in a row is what makes a homepage feel generic.
        $sectionSettings = [
            'platform' => ['layout' => 'bento'],
            'showcase' => ['layout' => 'compact'],
            'operations' => ['layout' => 'rows'],
            'ai' => [
                'panel_label' => 'AI copilot',
                'panel_badge' => 'Approval gated',
                'metrics' => [
                    ['value' => 'Plain language', 'label' => 'ask anything'],
                    ['value' => '100%', 'label' => 'human approved'],
                ],
            ],
            // Keep the homepage accordion short; the remaining entries stay in
            // the CMS for the support page and for admins to promote.
            'faq' => ['limit' => 5],
        ];
        foreach ($sectionSettings as $key => $settings) {
            $section($key)?->update(['settings' => $settings]);
        }

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

    /**
     * Product screenshots shipped in public/screenshots, keyed by file stem.
     *
     * Order matters: it drives both the /features page and which screenshot
     * each homepage section picks up.
     *
     * @var array<string, array{0: string, 1: string, 2: string}> stem => [title, slug, excerpt]
     */
    private const FEATURE_SCREENSHOTS = [
        'homedashboard' => ['Financial command center', 'financial-command-center', 'Revenue, expenses, profit, cash, receivables, and payables for any branch and date range on one screen.'],
        'reports' => ['63 reports, ready to run', 'business-reports', 'Ledgers, trial balance, ageing, sales, purchase, tax, inventory, and production reporting grouped for fast access.'],
        'invoice-details' => ['Invoicing with full context', 'invoicing', 'Every invoice carries its customer, branch, currency, approval state, and payment history in one view.'],
        'invoice-payment-link' => ['Online payment links and QR', 'online-payment-links', 'Share a secure payment link or QR code and let customers settle an invoice without a phone call.'],
        'customer_payment_interface' => ['Customer payments and receipts', 'customer-payments', 'Record receipts, allocate them across open invoices, and keep customer balances accurate as you go.'],
        'document-intellegence' => ['Document intelligence', 'document-intelligence', 'Upload bills, invoices, and receipts, then track them from scan through review to a posted transaction.'],
        'ai_document_extraction' => ['AI document extraction', 'ai-document-extraction', 'AI reads each uploaded document, matches customers and products, and prepares a draft you simply confirm.'],
        'transactionapproval' => ['Approvals and business rules', 'approval-workflows', 'Credit limits, negative stock, and pricing rules are checked before a transaction is approved and posted.'],
        'pos' => ['Point of sale', 'point-of-sale', 'A fast touch-friendly till that posts straight to inventory and accounts with no end-of-day re-entry.'],
        'pos-receipt' => ['Receipts and returns', 'pos-receipts', 'Print or share receipts instantly and process returns against the original sale.'],
        'pos-shifts-report' => ['Cashier shifts and cash control', 'pos-shift-control', 'Open and close shifts per terminal, count cash, and see expected against counted totals for every cashier.'],
        'leads' => ['Lead capture and pipeline', 'lead-management', 'Track every enquiry with owners, stages, and follow-up activity so nothing quietly goes cold.'],
        'deals' => ['Deals and opportunities', 'deal-pipeline', 'Move opportunities through your pipeline and carry them into quotations, orders, and invoices.'],
        'project_management' => ['Project management', 'project-management', 'Plan projects, assign tasks, and keep delivery work connected to the customers and costs behind it.'],
        'hrm_leave_applications' => ['HR and leave management', 'hr-leave-management', 'Employee records, attendance, and a clear leave request and approval trail for your whole team.'],
    ];

    /**
     * Registers each packaged screenshot in the media library.
     *
     * Files stay where they ship (public/screenshots) and are referenced through
     * the "features" disk, so no copying is done and no storage symlink is
     * needed for the seeded marketing site to render.
     *
     * @return array<string, Media> stem => media
     */
    private function seedFeatureMedia(): array
    {
        $media = [];

        foreach (self::FEATURE_SCREENSHOTS as $stem => [$title, , $excerpt]) {
            $file = public_path('screenshots/'.$stem.'.png');
            if (! is_file($file)) {
                continue;
            }
            [$width, $height] = getimagesize($file) ?: [null, null];
            $media[$stem] = Media::updateOrCreate(['path' => $stem.'.png'], [
                'disk' => 'screenshots', 'original_filename' => $stem.'.png', 'mime_type' => 'image/png',
                'size' => filesize($file), 'width' => $width, 'height' => $height,
                'title' => $title, 'alt_text' => $title.' in KiteLedger', 'caption' => $excerpt,
            ]);
        }

        return $media;
    }

    /** @param array<string, Media> $featureMedia */
    private function seedStructuredContent(array $featureMedia): void
    {
        $media = $featureMedia['homedashboard'] ?? null;

        $order = 0;
        foreach (self::FEATURE_SCREENSHOTS as $stem => [$title, $slug, $excerpt]) {
            WebsiteFeature::updateOrCreate(['slug' => $slug], [
                'title' => $title, 'excerpt' => $excerpt, 'body' => '<p>'.$excerpt.'</p>',
                'featured_media_id' => ($featureMedia[$stem] ?? null)?->id, 'status' => 'published',
                'published_at' => now(), 'sort_order' => $order++,
                'seo_title' => $title.' | KiteLedger', 'meta_description' => $excerpt,
            ]);
        }

        // Superseded by the screenshot-backed entries above.
        WebsiteFeature::whereIn('slug', ['connected-accounting', 'inventory-visibility', 'customer-relationships'])->delete();

        $category = ResourceCategory::updateOrCreate(['slug'=>'getting-started'], ['name'=>'Getting Started','description'=>'Short guides for configuring a new KiteLedger workspace.','status'=>'active','sort_order'=>0]);
        foreach ([
            ['Set up your company','set-up-your-company','Configure company identity, currency, dates, and branding.','Open Settings, review the company profile, choose your working currency and timezone, then upload the light and dark logo variants.','homedashboard'],
            ['Invite your team','invite-your-team','Add users and give each person a clear role.','Create users from the administration area, assign the smallest practical role, and verify access before sharing credentials.','hrm_leave_applications'],
            ['Create your first invoice','create-your-first-invoice','Move from customer details to a polished invoice.','Add the customer, create an invoice with clear line items and due dates, then record or collect payment from the invoice workflow.','invoice-details'],
        ] as $order => [$title,$slug,$excerpt,$body,$stem]) {
            $articleMedia = $featureMedia[$stem] ?? $media;
            ResourceArticle::updateOrCreate(['slug'=>$slug], ['category_id'=>$category->id,'title'=>$title,'excerpt'=>$excerpt,'body'=>'<h2>'.$title.'</h2><p>'.$body.'</p>','featured_media_id'=>$articleMedia?->id,'gallery_media_ids'=>$articleMedia?->id?[$articleMedia->id]:[],'status'=>'published','published_at'=>now(),'sort_order'=>$order,'seo_title'=>$title.' | KiteLedger Resources','meta_description'=>$excerpt]);
        }

        ContactLocation::firstOrCreate(['name'=>'Main Office'], ['address'=>'Update this address in Website → Contact Locations','email'=>'hello@example.com','business_hours'=>'Monday–Friday, 9:00–17:00','is_active'=>true,'sort_order'=>0]);
        foreach ([['LinkedIn','https://www.linkedin.com/'],['Facebook','https://www.facebook.com/'],['Instagram','https://www.instagram.com/']] as $order => [$platform,$url]) WebsiteSocialLink::firstOrCreate(['platform'=>$platform], ['url'=>$url,'icon'=>$platform,'is_active'=>false,'sort_order'=>$order]);
        NavbarNotification::firstOrCreate(['content'=>'Welcome to KiteLedger - one connected workspace for your business.'], ['link_label'=>'Explore features','link_url'=>'/features','target'=>'same_tab','is_dismissible'=>true,'is_active'=>false,'sort_order'=>0]);
    }
}
