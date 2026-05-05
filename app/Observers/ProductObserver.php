<?php

namespace App\Observers;

use App\Models\Product;
use App\Services\DocumentNumberingService;

class ProductObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
    ) {
    }

    public function creating(Product $product): void
    {
        if (!$product->code) {
            $code = $this->numberingService->generate('product');
            if ($code) {
                $product->code = $code;
            }
        }
    }
}
