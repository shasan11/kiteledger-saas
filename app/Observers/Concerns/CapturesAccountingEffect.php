<?php

namespace App\Observers\Concerns;

use Illuminate\Database\Eloquent\Model;

trait CapturesAccountingEffect
{
    protected static array $oldEffects = [];

    protected function effectKey(Model|string $model, mixed $id = null): string
    {
        if ($model instanceof Model) {
            return $model::class . ':' . $model->getKey();
        }

        return $model . ':' . $id;
    }

    protected function storeOldEffect(Model|string $model, mixed $id, array $effect): void
    {
        $key = $model instanceof Model
            ? $this->effectKey($model)
            : $this->effectKey($model, $id);

        static::$oldEffects[$key] ??= $effect;
    }

    protected function pullOldEffect(Model|string $model, mixed $id = null): array
    {
        $key = $model instanceof Model
            ? $this->effectKey($model)
            : $this->effectKey($model, $id);

        $effect = static::$oldEffects[$key] ?? [];

        unset(static::$oldEffects[$key]);

        return $effect;
    }
}
