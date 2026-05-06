<?php
use Inertia\Inertia;

Route::prefix('inventory')->name('inventory.')->group(function () {
    Route::get('/product-categories', fn () => Inertia::render('App/Inventory/ProductCategories/Index'))->name('product-categories.index');
    Route::get('/products', fn () => Inertia::render('App/Inventory/Products/Index'))->name('products.index');
    Route::get('/products/{id}', fn ($id) => Inertia::render('App/Inventory/Products/Show', ['id' => $id]))->name('products.show');
    Route::get('/variant-attributes', fn () => Inertia::render('App/Inventory/VariantAttributes/Index'))->name('variant-attributes.index');
    Route::get('/unit-of-measurements', fn () => Inertia::render('App/Inventory/UnitOfMeasurements/Index'))->name('unit-of-measurements.index');
    Route::get('/unit-of-measurements/{id}', fn ($id) => Inertia::render('App/Inventory/UnitOfMeasurements/Show', ['id' => $id]))->name('unit-of-measurements.show');
    Route::get('/warehouse-transfers', fn () => Inertia::render('App/Inventory/WarehouseTransfers/Index'))->name('warehouse-transfers.index');
    Route::get('/warehouse-transfers/{id}', fn ($id) => Inertia::render('App/Inventory/WarehouseTransfers/Show', ['id' => $id]))->name('warehouse-transfers.show');
    Route::get('/adjustments', fn () => Inertia::render('App/Inventory/Adjustments/Index'))->name('adjustments.index');
    Route::get('/adjustments/{id}', fn ($id) => Inertia::render('App/Inventory/Adjustments/Show', ['id' => $id]))->name('adjustments.show');
    Route::get('/bill-of-materials', fn () => Inertia::render('App/Inventory/BillOfMaterials/Index'))->name('bill-of-materials.index');
    Route::get('/bill-of-materials/{id}', fn ($id) => Inertia::render('App/Inventory/BillOfMaterials/Show', ['id' => $id]))->name('bill-of-materials.show');
    Route::get('/production-orders', fn () => Inertia::render('App/Inventory/ProductionOrders/Index'))->name('production-orders.index');
    Route::get('/production-journals', fn () => Inertia::render('App/Inventory/ProductionJournals/Index'))->name('production-journals.index');
    Route::get('/production-journals/{id}', fn ($id) => Inertia::render('App/Inventory/ProductionJournals/Show', ['id' => $id]))->name('production-journals.show');
});
