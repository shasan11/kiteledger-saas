<?php

namespace App\Services\Crm;

use App\Models\DealPipeline;
use App\Models\DealStage;

class CrmPipelineResolver
{
    public function getDefaultPipeline(): ?DealPipeline
    {
        return DealPipeline::query()
            ->where('is_default', true)
            ->where('active', true)
            ->first()
            ?? DealPipeline::query()
                ->where('active', true)
                ->orderBy('created_at')
                ->first();
    }

    public function getFirstStageForPipeline(string $pipelineId): ?DealStage
    {
        return DealStage::query()
            ->where('deal_pipeline_id', $pipelineId)
            ->where('is_won_stage', false)
            ->where('is_lost_stage', false)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->first();
    }

    public function resolvePipelineAndStage(?string $pipelineId = null, ?string $stageId = null): array
    {
        $pipeline = $pipelineId
            ? DealPipeline::query()->find($pipelineId)
            : $this->getDefaultPipeline();

        if (!$pipeline) {
            return ['pipeline_id' => null, 'stage_id' => null];
        }

        $stage = $stageId
            ? DealStage::query()->where('deal_pipeline_id', $pipeline->id)->find($stageId)
            : null;

        if (!$stage) {
            $stage = $this->getFirstStageForPipeline($pipeline->id);
        }

        return [
            'pipeline_id' => $pipeline->id,
            'stage_id'    => $stage?->id,
        ];
    }
}
