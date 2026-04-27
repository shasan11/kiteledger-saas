<?php
use Inertia\Inertia;

Route::prefix('inventory')->name('inventory.')->group(function () {
    Route::get('/product-categories', fn () => Inertia::render('App/Inventory/ProductCategories/Index'))->name('product-categories.index');
    Route::get('/products', fn () => Inertia::render('App/Inventory/Products/Index'))->name('products.index');
    Route::get('/variant-attributes', fn () => Inertia::render('App/Inventory/VariantAttributes/Index'))->name('variant-attributes.index');
    Route::get('/unit-of-measurements', fn () => Inertia::render('App/Inventory/UnitOfMeasurements/Index'))->name('unit-of-measurements.index');
    Route::get('/warehouse-transfers', fn () => Inertia::render('App/Inventory/WarehouseTransfers/Index'))->name('warehouse-transfers.index');
    Route::get('/adjustments', fn () => Inertia::render('App/Inventory/Adjustments/Index'))->name('adjustments.index');
    Route::get('/bill-of-materials', fn () => Inertia::render('App/Inventory/BillOfMaterials/Index'))->name('bill-of-materials.index');
    Route::get('/production-orders', fn () => Inertia::render('App/Inventory/ProductionOrders/Index'))->name('production-orders.index');
    Route::get('/production-journals', fn () => Inertia::render('App/Inventory/ProductionJournals/Index'))->name('production-journals.index');
});
