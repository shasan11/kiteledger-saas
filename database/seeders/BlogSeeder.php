<?php

namespace Database\Seeders;

use App\Models\Central\BlogCategory;
use App\Models\Central\BlogPost;
use App\Models\Central\BlogTag;
use Illuminate\Database\Seeder;

class BlogSeeder extends Seeder
{
    public function run(): void
    {
        $categories = collect([
            'product-updates' => ['Product Updates', 'Release notes and product guidance.'],
            'business-guides' => ['Business Guides', 'Practical guides for business operations.'],
            'accounting-insights' => ['Accounting Insights', 'Clear explanations of accounting workflows.'],
        ])->mapWithKeys(function ($data, $slug): array {
            $category = BlogCategory::firstOrCreate(['slug' => $slug], ['name' => $data[0], 'description' => $data[1], 'status' => 'active']);

            return [$slug => $category];
        });
        $tags = collect(['accounting', 'invoicing', 'inventory', 'reporting', 'security', 'automation', 'small-business', 'operations', 'cash-flow', 'productivity'])->mapWithKeys(function ($slug): array {
            $tag = BlogTag::firstOrCreate(['slug' => $slug], ['name' => str($slug)->replace('-', ' ')->title(), 'status' => 'active']);

            return [$slug => $tag];
        });
        $posts = [
            'a-practical-month-end-checklist' => ['A practical month-end checklist', 'business-guides', ['accounting', 'reporting'], 'A repeatable close starts with clear ownership and a short, reliable checklist.'],
            'building-a-consistent-invoicing-process' => ['Building a consistent invoicing process', 'accounting-insights', ['invoicing', 'cash-flow'], 'Simple conventions make invoices easier to issue, review, and reconcile.'],
            'understanding-inventory-movements' => ['Understanding inventory movements', 'accounting-insights', ['inventory', 'operations'], 'A useful stock record explains what moved, where it moved, and why.'],
            'keeping-administrative-access-secure' => ['Keeping administrative access secure', 'business-guides', ['security', 'operations'], 'MFA, least privilege, and audit review form a practical security baseline.'],
            'welcome-to-kiteledger' => ['Welcome to KiteLedger', 'product-updates', ['productivity', 'automation'], 'KiteLedger brings financial and operational workflows into a tenant-isolated SaaS platform.'],
        ];
        foreach ($posts as $slug => [$title, $category, $postTags, $excerpt]) {
            $post = BlogPost::firstOrCreate(['slug' => $slug], [
                'title' => $title, 'excerpt' => $excerpt, 'content' => '<p>'.$excerpt.'</p><h2>Start with a reliable process</h2><p>Use clear responsibilities, review checkpoints, and records that your team can understand later.</p>',
                'status' => 'published', 'visibility' => 'public', 'published_at' => now(),
                'seo_title' => $title.' | KiteLedger', 'meta_description' => $excerpt,
            ]);
            $post->categories()->syncWithoutDetaching([$categories[$category]->id]);
            $post->tags()->syncWithoutDetaching(collect($postTags)->map(fn ($tag) => $tags[$tag]->id)->all());
        }
    }
}
