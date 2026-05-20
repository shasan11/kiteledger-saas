<?php

namespace App\Services\Search;

use App\Services\Search\Definitions\ActionSearchDefinitions;
use App\Services\Search\Definitions\PageSearchDefinitions;
use App\Services\Search\Definitions\RecordSearchDefinitions;
use App\Services\Search\Definitions\ReportSearchDefinitions;
use App\Services\Search\Definitions\SettingSearchDefinitions;

class GlobalSearchRegistry
{
    public function pages(): array
    {
        return PageSearchDefinitions::items();
    }

    public function records(): array
    {
        return RecordSearchDefinitions::items();
    }

    public function settings(): array
    {
        return SettingSearchDefinitions::items();
    }

    public function reports(): array
    {
        return ReportSearchDefinitions::items();
    }

    public function actions(): array
    {
        return ActionSearchDefinitions::items();
    }
}
