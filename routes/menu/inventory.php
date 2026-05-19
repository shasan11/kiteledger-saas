<?php
use Inertia\Inertia;

Route::prefix('inventory')->name('inventory.')->group(function () {
    Route::get('/product-categories', fn () => Inertia::render('App/Inventory/ProductCategories/Index'))->name('product-categories.index');
    Route::get('/products', fn () => Inertia::render('App/Inventory/Products/Index'))->name('products.index');
    Route::get('/products/{id}', fn ($id) => Inertia::render('App/Inventory/Products/Show', ['id' => $id]))->name('products.show');
    Route::get('/services', fn () => Inertia::render('App/Inventory/Services/Index'))->name('services.index');
    Route::get('/variant-products', fn () => Inertia::render('App/Inventory/VariantProducts/Index'))->name('variant-products.index');
    Route::get('/variant-products/{id}', fn ($id) => Inertia::render('App/Inventory/VariantProducts/Show', ['id' => $id]))->name('variant-products.show');
    Route::get('/warehouse-items', fn () => Inertia::render('App/Inventory/WarehouseItems/Index'))->name('warehouse-items.index');
    Route::get('/variant-attributes', fn () => Inertia::render('App/Inventory/VariantAttributes/Index'))->name('variant-attributes.index');
    Route::get('/unit-of-measurements', fn () => Inertia::render('App/Inventory/UnitOfMeasurements/Index'))->name('unit-of-measurements.index');
    Route::get('/unit-of-measurements/{id}', fn ($id) => Inertia::render('App/Inventory/UnitOfMeasurements/Show', ['id' => $id]))->name('unit-of-measurements.show');

    Route::get('/warehouse-transfers', fn () => Inertia::render('App/Inventory/WarehouseTransfers/Index'))->name('warehouse-transfers.index');
    Route::get('/warehouse-transfers/add', fn () => Inertia::render('App/Inventory/WarehouseTransfers/Add'))->name('warehouse-transfers.add');
    Route::get('/warehouse-transfers/{id}/edit', fn ($id) => Inertia::render('App/Inventory/WarehouseTransfers/Edit', ['id' => $id]))->name('warehouse-transfers.edit');
    Route::get('/warehouse-transfers/{id}', fn ($id) => Inertia::render('App/Inventory/WarehouseTransfers/Show', ['id' => $id]))->name('warehouse-transfers.show');

    Route::get('/adjustments', fn () => Inertia::render('App/Inventory/Adjustments/Index'))->name('adjustments.index');
    Route::get('/adjustments/add', fn () => Inertia::render('App/Inventory/Adjustments/Add'))->name('adjustments.add');
    Route::get('/adjustments/{id}/edit', fn ($id) => Inertia::render('App/Inventory/Adjustments/Edit', ['id' => $id]))->name('adjustments.edit');
    Route::get('/adjustments/{id}', fn ($id) => Inertia::render('App/Inventory/Adjustments/Show', ['id' => $id]))->name('adjustments.show');

    Route::get('/bill-of-materials', fn () => Inertia::render('App/Inventory/BillOfMaterials/Index'))->name('bill-of-materials.index');
    Route::get('/bill-of-materials/{id}', fn ($id) => Inertia::render('App/Inventory/BillOfMaterials/Show', ['id' => $id]))->name('bill-of-materials.show');
    Route::get('/production-orders', fn () => Inertia::render('App/Inventory/ProductionOrders/Index'))->name('production-orders.index');
    Route::get('/production-orders/{id}', fn ($id) => Inertia::render('App/Inventory/ProductionOrders/Show', ['id' => $id]))->name('production-orders.show');
    Route::get('/production-journals', fn () => Inertia::render('App/Inventory/ProductionJournals/Index'))->name('production-journals.index');
    Route::get('/production-journals/{id}', fn ($id) => Inertia::render('App/Inventory/ProductionJournals/Show', ['id' => $id]))->name('production-journals.show');
});
