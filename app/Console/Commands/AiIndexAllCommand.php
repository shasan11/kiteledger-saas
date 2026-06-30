<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class AiIndexAllCommand extends Command
{
    protected $signature = 'ai:index-all {--no-embeddings : Build keyword indexes only}';

    protected $description = 'Index all KiteLedger app and business knowledge.';

    public function handle(): int
    {
        $options = $this->option('no-embeddings') ? ['--no-embeddings' => true] : [];
        $app = $this->call('ai:index-app', $options);
        $business = $this->call('ai:index-business', $options);
        $this->call('ai:index-status');

        return ($app === self::SUCCESS && $business === self::SUCCESS) ? self::SUCCESS : self::FAILURE;
    }
}
