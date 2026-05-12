<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // invoice_lines: rename custom_product_name → product_name, add discount_type + discount_amount
        if (Schema::hasTable('invoice_lines')) {
            Schema::table('invoice_lines', function (Blueprint $table) {
                if (Schema::hasColumn('invoice_lines', 'custom_product_name') && !Schema::hasColumn('invoice_lines', 'product_name')) {
                    $table->renameColumn('custom_product_name', 'product_name');
                }
                if (!Schema::hasColumn('invoice_lines', 'discount_type')) {
                    $table->string('discount_type', 10)->default('percent')->after('unit_price');
                }
                if (!Schema::hasColumn('invoice_lines', 'discount_amount')) {
                    $table->decimal('discount_amount', 15, 2)->default(0)->after('discount_percent');
                }
            });
        }

        // sales_order_lines: rename custom_product_name → product_name, add discount_type
        if (Schema::hasTable('sales_order_lines')) {
            Schema::table('sales_order_lines', function (Blueprint $table) {
                if (Schema::hasColumn('sales_order_lines', 'custom_product_name') && !Schema::hasColumn('sales_order_lines', 'product_name')) {
                    $table->renameColumn('custom_product_name', 'product_name');
                }
                if (!Schema::hasColumn('sales_order_lines', 'discount_type')) {
                    $table->string('discount_type', 10)->default('percent')->after('unit_price');
                }
            });
        }

        // sales_return_lines: rename custom_product_name → product_name, add discount_type
        if (Schema::hasTable('sales_return_lines')) {
            Schema::table('sales_return_lines', function (Blueprint $table) {
                if (Schema::hasColumn('sales_return_lines', 'custom_product_name') && !Schema::hasColumn('sales_return_lines', 'product_name')) {
                    $table->renameColumn('custom_product_name', 'product_name');
                }
                if (!Schema::hasColumn('sales_return_lines', 'discount_type')) {
                    $table->string('discount_type', 10)->default('percent')->after('unit_price');
                }
            });
        }

        // quotation_lines: add discount_type
        if (Schema::hasTable('quotation_lines')) {
            Schema::table('quotation_lines', function (Blueprint $table) {
                if (!Schema::hasColumn('quotation_lines', 'discount_type')) {
                    $table->string('discount_type', 10)->default('percent')->after('unit_price');
                }
            });
        }

        // purchase_order_lines: rename custom_product_name → product_name, add discount_type + discount_amount
        if (Schema::hasTable('purchase_order_lines')) {
            Schema::table('purchase_order_lines', function (Blueprint $table) {
                if (Schema::hasColumn('purchase_order_lines', 'custom_product_name') && !Schema::hasColumn('purchase_order_lines', 'product_name')) {
                    $table->renameColumn('custom_product_name', 'product_name');
                }
                if (!Schema::hasColumn('purchase_order_lines', 'discount_type')) {
                    $table->string('discount_type', 10)->default('percent')->after('unit_price');
                }
                if (!Schema::hasColumn('purchase_order_lines', 'discount_amount')) {
                    $table->decimal('discount_amount', 15, 2)->default(0)->after('discount_percent');
                }
            });
        }

        // purchase_bill_lines: rename custom_product_name → product_name, add discount_type + discount_amount
        if (Schema::hasTable('purchase_bill_lines')) {
            Schema::table('purchase_bill_lines', function (Blueprint $table) {
                if (Schema::hasColumn('purchase_bill_lines', 'custom_product_name') && !Schema::hasColumn('purchase_bill_lines', 'product_name')) {
                    $table->renameColumn('custom_product_name', 'product_name');
                }
                if (!Schema::hasColumn('purchase_bill_lines', 'discount_type')) {
                    $table->string('discount_type', 10)->default('percent')->after('unit_price');
                }
                if (!Schema::hasColumn('purchase_bill_lines', 'discount_amount')) {
                    $table->decimal('discount_amount', 15, 2)->default(0)->after('discount_percent');
                }
            });
        }

        // debit_note_lines: add product_name, discount_percent, discount_type, discount_amount
        if (Schema::hasTable('debit_note_lines')) {
            Schema::table('debit_note_lines', function (Blueprint $table) {
                if (!Schema::hasColumn('debit_note_lines', 'product_name')) {
                    $table->string('product_name', 255)->nullable()->after('product_id');
                }
                if (!Schema::hasColumn('debit_note_lines', 'discount_percent')) {
                    $table->decimal('discount_percent', 8, 4)->default(0)->after('unit_price');
                }
                if (!Schema::hasColumn('debit_note_lines', 'discount_type')) {
                    $table->string('discount_type', 10)->default('percent')->after('discount_percent');
                }
                if (!Schema::hasColumn('debit_note_lines', 'discount_amount')) {
                    $table->decimal('discount_amount', 15, 2)->default(0)->after('discount_type');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('quotation_lines') && Schema::hasColumn('quotation_lines', 'discount_type')) {
            Schema::table('quotation_lines', function (Blueprint $table) {
                $table->dropColumn('discount_type');
            });
        }

        if (Schema::hasTable('invoice_lines')) {
            Schema::table('invoice_lines', function (Blueprint $table) {
                if (Schema::hasColumn('invoice_lines', 'discount_type')) {
                    $table->dropColumn('discount_type');
                }
            });
        }

        if (Schema::hasTable('sales_order_lines') && Schema::hasColumn('sales_order_lines', 'discount_type')) {
            Schema::table('sales_order_lines', function (Blueprint $table) {
                $table->dropColumn('discount_type');
            });
        }

        if (Schema::hasTable('sales_return_lines') && Schema::hasColumn('sales_return_lines', 'discount_type')) {
            Schema::table('sales_return_lines', function (Blueprint $table) {
                $table->dropColumn('discount_type');
            });
        }

        if (Schema::hasTable('purchase_order_lines') && Schema::hasColumn('purchase_order_lines', 'discount_type')) {
            Schema::table('purchase_order_lines', function (Blueprint $table) {
                $table->dropColumn('discount_type');
            });
        }

        if (Schema::hasTable('purchase_bill_lines') && Schema::hasColumn('purchase_bill_lines', 'discount_type')) {
            Schema::table('purchase_bill_lines', function (Blueprint $table) {
                $table->dropColumn('discount_type');
            });
        }

        if (Schema::hasTable('debit_note_lines')) {
            Schema::table('debit_note_lines', function (Blueprint $table) {
                if (Schema::hasColumn('debit_note_lines', 'discount_type')) {
                    $table->dropColumn('discount_type');
                }
                if (Schema::hasColumn('debit_note_lines', 'discount_amount')) {
                    $table->dropColumn('discount_amount');
                }
            });
        }
    }
};
